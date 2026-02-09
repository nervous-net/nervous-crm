# Deal Email Sending & Shared Inbox

**Branch:** `feature/deal-emails`
**Status:** Code complete, awaiting Resend config + migration push to staging

---

## What Was Built

### Database
- **`deal_emails`** table — stores both outbound (sent from Dossier) and inbound (received via webhook) emails per deal
- Migration: `supabase/migrations/20260209000002_deal_emails.sql`
- Schema ref updated in `supabase-schema.sql`
- TypeScript types in `web/src/lib/database.types.ts`
- RLS policies use the `get_team_id()` pattern (same as all other tables)
- FKs reference `profiles(id)` not `auth.users(id)`

### Edge Functions

**`supabase/functions/send-deal-email/index.ts`**
- JWT authenticated (same pattern as `send-invite-email`)
- Validates deal belongs to caller's team
- Sends via Resend API from `Dossier <dossier@mail.nervous.net>`
- Sets `reply_to: dossier@mail.nervous.net` so replies route through Resend inbound
- Supports threading headers (`In-Reply-To`, `References`) for replies
- Stores email row in `deal_emails` (direction: outbound)
- Creates activity breadcrumb (type: email, auto-completed)

**`supabase/functions/receive-email/index.ts`**
- Webhook endpoint (NOT JWT — uses Svix signature verification)
- Uses Supabase service role key to bypass RLS when writing
- Fetches full email body from Resend API (`GET /emails/receiving/{email_id}`)
- Matches inbound email to a deal in two ways:
  1. **Thread match** — checks `in_reply_to` against `deal_emails.message_id` (most reliable)
  2. **Contact match** — looks up sender email in `contacts.email`, finds deals linked to that contact
- No match → logs and discards (team_id is required, can't store orphan emails)
- Stores email row in `deal_emails` (direction: inbound)
- Creates activity breadcrumb

### Frontend

**`web/src/components/ui/dialog.tsx`** — Radix Dialog component (was missing from UI library)

**`web/src/pages/deals/ComposeEmail.tsx`** — Modal for composing emails
- To, CC, Subject, Body fields
- Pre-populates To from deal contact email
- Reply mode: pre-fills To from original sender, Subject with `Re:` prefix
- react-hook-form + zod validation
- Invalidates `deal-emails` and `deal-activities` queries on success

**`web/src/pages/deals/DealInbox.tsx`** — Inbox card for deal detail page
- Chronological email list (thread style)
- Direction icon: blue (outbound/Send), green (inbound/Inbox)
- Shows sender name, subject, truncated preview
- Click to expand inline — shows full HTML body (or text fallback)
- Expanded view has Reply button
- Compose button in header

**`web/src/pages/deals/DealDetail.tsx`** — Modified to include `<DealInbox>` between Activities and Team Members/Notes

**`web/src/lib/db.ts`** — Three functions added:
- `getDealEmails(dealId)` — all emails for a deal, chronological, with sender profile join
- `sendDealEmail(params)` — invokes `send-deal-email` edge function
- `reassignDealEmail(emailId, dealId)` — moves email to a different deal (for "Move to deal..." feature)
- `DealEmailWithSender` interface

---

## What Still Needs To Happen

### 1. Resend Domain Setup (manual, in Resend dashboard)

The sending/receiving domain is `mail.nervous.net` (subdomain avoids MX conflicts with root domain).

**Sending domain:**
1. Go to Resend → Domains → Add Domain → `mail.nervous.net`
2. Add the DNS records Resend provides (SPF, DKIM, DMARC)
3. Verify

**Receiving domain:**
1. Go to Resend → Domains → the `mail.nervous.net` entry → enable Inbound
2. Add the MX record Resend provides to DNS:
   ```
   mail.nervous.net  MX  10  inbound-smtp.resend.com
   ```

### 2. Resend Webhook Setup (manual, in Resend dashboard)

1. Go to Resend → Webhooks → Add Endpoint
2. URL: `https://ophighfxmohqznbqgxyj.supabase.co/functions/v1/receive-email`
3. Events: subscribe to `email.received`
4. Copy the **Signing Secret** (starts with `whsec_`)

### 3. Supabase Secrets

```bash
supabase secrets set RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

(`RESEND_API_KEY` should already be set from invite emails.)

### 4. Apply Migration to Staging

```bash
supabase db push
```

Or run the migration SQL manually in the Supabase SQL Editor from:
`supabase/migrations/20260209000002_deal_emails.sql`

### 5. Deploy Edge Functions

```bash
supabase functions deploy send-deal-email
supabase functions deploy receive-email
```

### 6. Test End-to-End

- [ ] Send email from deal detail → check it appears in inbox
- [ ] Check activity breadcrumb appears in Activities section
- [ ] Reply from external email client → verify it routes to correct deal inbox
- [ ] Test contact-based matching (send from an email that matches a contact on a deal)
- [ ] Verify RLS — emails should only be visible to team members
- [ ] Test compose pre-population (To field from deal contact)
- [ ] Test inline reply (subject, recipient, threading)

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| `mail.nervous.net` subdomain | Avoids MX conflicts with root domain `nervous.net` |
| Svix verification on webhook | Resend uses Svix for webhook signing — standard approach |
| Service role key for webhook writes | Webhook has no user JWT — service role bypasses RLS safely |
| Thread matching before contact matching | `In-Reply-To` header is the most reliable way to match replies |
| Discard unmatched inbound | `team_id` is required by schema — orphan emails can't be stored |
| Activity breadcrumbs auto-completed | Email send/receive events are facts, not future tasks |
| `reassignDealEmail` function | Enables "Move to deal..." feature for misrouted emails |

---

## File Inventory

### Created
| File | Purpose |
|------|---------|
| `supabase/migrations/20260209000002_deal_emails.sql` | Migration |
| `supabase/functions/send-deal-email/index.ts` | Outbound email edge function |
| `supabase/functions/receive-email/index.ts` | Inbound webhook edge function |
| `web/src/components/ui/dialog.tsx` | Radix Dialog component |
| `web/src/pages/deals/ComposeEmail.tsx` | Compose/reply modal |
| `web/src/pages/deals/DealInbox.tsx` | Inbox card component |

### Modified
| File | What Changed |
|------|-------------|
| `supabase-schema.sql` | Added `deal_emails` table, indexes, RLS |
| `web/src/lib/database.types.ts` | Added `deal_emails` types |
| `web/src/lib/db.ts` | Added email query/mutation functions |
| `web/src/pages/deals/DealDetail.tsx` | Wired in `<DealInbox>` component |

---

## Future Enhancements (not in scope)

- "Move to deal" UI (function exists in db.ts, no UI yet)
- Email search/filter within inbox
- Attachments support (Resend supports this, just need to add fields)
- Email templates / saved responses
- Notification when inbound email arrives (real-time via Supabase channels)
