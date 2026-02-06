# Pricing Plan — Dossier (Nervous CRM)

## Plan: Option B — Generous Free + One Paid Tier

### Pricing Table

|  | **Free** | **Pro** |
|---|---|---|
| **Monthly** | $0 | $15/user/month |
| **Annual** | $0 | **$11.25/user/month** (25% off, billed $135/user/year) |
| Users | Up to 2 | Unlimited |
| Contacts | 500 | Unlimited |
| Companies | 100 | Unlimited |
| Deals | Unlimited | Unlimited |
| Activities | Unlimited | Unlimited |
| Team invites | — | Included |
| Audit logs | — | Included |
| Priority support | — | Included |

### Why This Model

- The brand promises simplicity and accessibility — a generous free tier honors that
- One paid tier keeps pricing dead simple (no confusing feature matrices)
- Upgrade trigger is natural: you outgrow 2 users or 500 contacts, you upgrade
- $15/user/month undercuts Attio ($29), Folk ($20), Streak ($49) while staying competitive with Less Annoying ($15) and Capsule ($18)
- 25% annual discount rewards commitment and improves cash flow predictability

---

## Infrastructure Cost Breakdown

### Service Stack

| Service | Role | Free Tier | Paid Tier |
|---------|------|-----------|-----------|
| **Supabase** | Auth + Database | 50K MAUs, 500MB DB | $25/mo (100K MAUs, 8GB DB) |
| **Netlify** | Frontend hosting | 300 credits/mo | $9/mo (1,000 credits) |
| **Sentry** | Error tracking | 5,000 errors/mo | $29/mo (50K errors) |
| **Resend** | Auth OTP emails | 3,000 emails/mo (100/day) | $20/mo (50K emails) |

### Cost Per Free User

A single free account (2 users, 500 contacts, 100 companies) consumes:

| Resource | Amount | Cost |
|----------|--------|------|
| Database storage | ~550 KB | ~$0.00 |
| Auth MAUs | 1–2 | $0.00 (free) / $0.003–$0.007 (on Pro overage) |
| OTP emails | ~10–20/month | $0.004–$0.02 |
| Bandwidth | ~10–20 MB/month | ~$0.00 |
| **Total per free account** | | **~$0.01–$0.02/month** |

At 1,000 free accounts: **~$10–$20/month** in marginal infrastructure cost.

### Cost Per Small Paid Team (5 Users)

A paid team (5 users, ~2,000 contacts, ~500 companies) consumes:

| Resource | Amount | Cost |
|----------|--------|------|
| Database storage | ~2.4 MB | ~$0.00 |
| Auth MAUs | 5 | $0.00–$0.016 |
| OTP emails | ~50/month | $0.02–$0.05 |
| Bandwidth | ~50–100 MB/month | ~$0.00 |
| **Total per team** | | **~$0.03–$0.07/month** |

---

## Revenue Per Team

| Scenario | Monthly Revenue | Monthly Cost | Margin |
|----------|----------------|-------------|--------|
| 1 free account (2 users) | $0 | ~$0.02 | -$0.02 |
| 5-person team (monthly) | $75 | ~$0.05 | **$74.95 (99.9%)** |
| 5-person team (annual) | $56.25 | ~$0.05 | **$56.20 (99.9%)** |
| 10-person team (monthly) | $150 | ~$0.10 | **$149.90 (99.9%)** |
| 10-person team (annual) | $112.50 | ~$0.10 | **$112.40 (99.9%)** |

---

## Infrastructure Upgrade Thresholds

When free tiers run out and we need to start paying:

| Trigger | Threshold | Upgrade | Added Cost |
|---------|-----------|---------|------------|
| Auth OTP emails exceed 100/day | ~100 daily logins | Resend Pro | +$20/mo |
| Database exceeds 500 MB | ~500 active teams | Supabase Pro | +$25/mo |
| Netlify credits exhausted | Frequent deploys + moderate traffic | Netlify Personal | +$9/mo |
| Errors exceed 5K/month | ~10+ active teams with bugs | Sentry Team | +$29/mo |

**Full paid stack: $83/month**

---

## Break-Even Analysis

### Phase 1: All Free Tiers ($0/month infrastructure)

Viable up to approximately:
- ~100 daily active users
- ~200 total free accounts
- ~3,000 OTP emails/month

**Break-even: $0 revenue needed.** This phase is literally free.

### Phase 2: First Paid Service — Resend ($20/month)

Triggered when daily logins exceed 100. At this point:

| To break even | You need |
|---------------|----------|
| $20/month | **1 team of 2 paying monthly** ($30) |
| | or **1 team of 2 paying annually** ($22.50) |

### Phase 3: Full Paid Stack ($83/month)

All four services on paid tiers:

| To break even | You need |
|---------------|----------|
| $83/month | **2 teams of 3 paying monthly** ($90) |
| | or **2 teams of 4 paying annually** ($90) |
| | or **1 team of 6 paying monthly** ($90) |

### Phase 4: Stripe Fees Enter the Picture

Stripe takes 2.9% + $0.30 per transaction.

| Team size | Monthly billing | Annual billing |
|-----------|----------------|----------------|
| 2-person team | $30 revenue → $0.87 + $0.30 = **$1.17 fee** | $270/yr → $7.83 + $0.30 = **$8.13 fee** |
| 5-person team | $75 revenue → $2.18 + $0.30 = **$2.48 fee** | $675/yr → $19.58 + $0.30 = **$19.88 fee** |
| 10-person team | $150 revenue → $4.35 + $0.30 = **$4.65 fee** | $1,350/yr → $39.15 + $0.30 = **$39.45 fee** |

Annual billing is more efficient — fewer transactions means fewer $0.30 fixed fees.

### Phase 5: Sustainable Business

To cover infrastructure ($83/mo) + Stripe fees + your time:

| Monthly target | What it looks like |
|----------------|-------------------|
| **$500/month** | 7 five-person teams on monthly, or 9 on annual |
| **$1,000/month** | 14 five-person teams on monthly, or 18 on annual |
| **$5,000/month** | 67 five-person teams on monthly, or 89 on annual |

At $5K MRR, infrastructure is still under $100/month. The margins stay absurd all the way up.

---

## Key Takeaways

1. **Free users cost almost nothing** — ~$0.02/month each. Be generous with the free tier.
2. **A single paying team covers infrastructure** — break-even is 2 small teams.
3. **Margins are 99%+** — Supabase + Netlify make per-user costs negligible.
4. **Annual billing is better for everyone** — less Stripe fees for us, 25% discount for them.
5. **The real costs at scale are people, not servers** — support, marketing, and development time will outpace infrastructure by 100x.
6. **Resend is the first thing that needs paying for** — the 100/day email cap is the tightest free-tier limit relative to the auth flow.

---

## Competitive Reference

| Product | Entry Price | Our Position |
|---------|------------|--------------|
| Twenty CRM (cloud) | $9/user/mo | We're slightly above, but don't require self-hosting |
| Less Annoying CRM | $15/user/mo | Matched on monthly, we're cheaper on annual |
| Capsule CRM | $18/user/mo | We undercut by 17-37% |
| Folk CRM | $20/user/mo | We undercut by 25-44% |
| Attio | $29/user/mo | We undercut by 48-61% |
| Streak CRM | $49/user/mo | We undercut by 69-77% |

We have a free tier. Less Annoying, Folk, Streak, and Copper do not.
