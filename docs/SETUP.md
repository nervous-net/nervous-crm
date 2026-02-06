# Service Setup Instructions — Dossier (Nervous CRM)

Step-by-step guide for setting up all required services.

---

## 1. Supabase (Auth + Database)

Supabase provides authentication, Postgres database, and row-level security.

### Create Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**
3. Choose your organization (or create one)
4. Set project name: `dossier` (or `nervous-crm`)
5. Set a strong database password — save it somewhere safe
6. Select region closest to your users (e.g. `us-west-1` for West Coast)
7. Click **Create new project** and wait for provisioning (~2 minutes)

### Get API Keys

1. Go to **Settings → API**
2. Copy these two values:
   - **Project URL** → this becomes `VITE_SUPABASE_URL`
   - **anon / public key** → this becomes `VITE_SUPABASE_ANON_KEY`

### Configure Authentication

1. Go to **Authentication → Providers**
2. Ensure **Email** provider is enabled
3. Under Email provider settings:
   - Enable **Email OTP (Magic Link)**
   - Set OTP expiry to `600` seconds (10 minutes)
   - Disable email confirmation requirement if using OTP-only flow
4. Go to **Authentication → URL Configuration**
   - Set **Site URL** to your production URL (e.g. `https://dossier.netlify.app`)
   - Add `http://localhost:5173` to **Redirect URLs** for local dev

### Apply Database Schema

Run the SQL migrations from the `supabase/migrations/` directory in the Supabase SQL editor, or use the Supabase CLI:

```bash
npx supabase db push
```

This creates all tables (teams, profiles, companies, contacts, deals, activities, invites, audit_logs) with RLS policies and indexes.

### Plan

Start on the **Free** tier:
- 500 MB database, 50K MAUs, 5 GB egress
- Upgrade to **Pro ($25/month)** when you hit ~500 active teams or 500 MB storage

---

## 2. Resend (Transactional Email for Auth OTP)

Supabase's built-in email is capped at **2 emails per hour** — completely unusable for passwordless auth. You need an external SMTP provider.

### Create Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email address

### Set Up Domain (Recommended)

Sending from a custom domain improves deliverability and looks professional.

1. Go to **Domains** in the Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g. `nervous.net` or `mail.nervous.net`)
4. Add the DNS records Resend provides:
   - **SPF** record (TXT)
   - **DKIM** records (TXT, usually 3 records)
   - **DMARC** record (TXT, optional but recommended)
5. Click **Verify** — DNS propagation takes a few minutes to a few hours

### Get SMTP Credentials

1. Go to **API Keys** in Resend dashboard
2. Create a new API key with **Sending access**
3. Note these SMTP details:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (STARTTLS)
   - **Username**: `resend`
   - **Password**: your API key (starts with `re_`)

### Connect to Supabase

1. In Supabase, go to **Project Settings → Auth → SMTP Settings**
2. Toggle **Enable Custom SMTP** on
3. Enter:
   - **Sender email**: `noreply@yourdomain.com` (must match your verified domain)
   - **Sender name**: `Dossier` (or `Nervous CRM`)
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: your Resend API key
4. Click **Save**
5. Test by triggering a login — you should receive a real OTP email

### Plan

Start on the **Free** tier:
- 3,000 emails/month (100/day limit)
- Covers ~100 daily logins
- Upgrade to **Pro ($20/month)** when daily logins consistently exceed 100

---

## 3. Netlify (Frontend Hosting)

### Create Site

1. Go to [netlify.com](https://www.netlify.com) and sign up / log in
2. Click **Add new site → Import an existing project**
3. Connect your GitHub repo
4. Configure build settings:
   - **Base directory**: `web`
   - **Build command**: `npm run build`
   - **Publish directory**: `web/dist`
5. Click **Deploy site**

### Rename Site to Dossier

1. Go to **Site configuration → Site details → Site information**
2. Click **Change site name**
3. Set to `dossier` → your site URL becomes `https://dossier.netlify.app`

Or via CLI:

```bash
npx netlify-cli sites:update --name dossier
```

### Set Environment Variables

1. Go to **Site configuration → Environment variables**
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `VITE_SENTRY_DSN` = your Sentry DSN (optional, add when ready)
3. **Trigger a redeploy** after adding variables (they're baked in at build time)

### Custom Domain (Optional)

1. Go to **Domain management → Add a domain**
2. Enter your domain (e.g. `app.nervous.net`)
3. Add the DNS records Netlify provides (CNAME or A record)
4. SSL certificate is provisioned automatically

### Plan

Start on the **Free** tier:
- 300 credits/month (covers ~20 deploys + moderate traffic)
- Upgrade to **Personal ($9/month)** if you deploy frequently or traffic grows

---

## 4. Sentry (Error Tracking)

### Create Project

1. Go to [sentry.io](https://sentry.io) and sign up / log in
2. Create a new project:
   - Platform: **React**
   - Project name: `dossier` (or `nervous-crm`)
3. Copy the **DSN** from the setup wizard or **Settings → Client Keys**

### Configure

The Sentry SDK is already integrated in the frontend code (`web/src/lib/sentry.ts`).

1. Set the `VITE_SENTRY_DSN` environment variable in Netlify (see above)
2. Redeploy to activate

### Tune Sample Rates

Default settings in the code:
- `tracesSampleRate`: 10% in production, 100% in dev
- `replaysSessionSampleRate`: 10% of sessions
- `replaysOnErrorSampleRate`: 100% of error sessions

Adjust these if you're burning through your event quota too fast.

### Plan

Start on the **Developer** tier (free):
- 5,000 errors/month, 10M spans, 50 replays
- Upgrade to **Team ($29/month)** if you need longer retention or hit the error cap

---

## 5. Stripe (Payment Processing — When Ready)

Not needed until you launch the paid Pro tier.

### Create Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business verification
3. Get API keys from **Developers → API keys**

### Create Products

Create these in the Stripe dashboard or via API:

| Product | Price | Billing |
|---------|-------|---------|
| Dossier Pro (Monthly) | $15/user/month | Recurring monthly |
| Dossier Pro (Annual) | $11.25/user/month | Recurring yearly ($135/user/year) |

### Integration Points

When you're ready to build billing:
- **Stripe Checkout** for the upgrade flow (hosted payment page, minimal code)
- **Stripe Customer Portal** for managing subscriptions (cancel, change plan)
- **Webhooks** to sync subscription status back to Supabase (listen for `customer.subscription.created`, `updated`, `deleted`)
- Store `stripe_customer_id` and `subscription_status` on the `teams` table

### Plan

Stripe charges:
- 2.9% + $0.30 per transaction
- No monthly fee

For a 5-person team on monthly ($75/month): Stripe takes ~$2.48/transaction.

---

## Setup Order

Do these in order — each step depends on the previous:

1. **Supabase** — database and auth foundation
2. **Resend** — wire up SMTP so auth emails actually send
3. **Netlify** — deploy the frontend, set env vars, rename to `dossier`
4. **Sentry** — add error tracking DSN, redeploy
5. **Stripe** — later, when launching paid tier

---

## Local Development

```bash
# Clone and install
git clone <repo-url>
cd nevous-crm/web
npm install

# Create .env file
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server
npm run dev
# App runs at http://localhost:5173
```
