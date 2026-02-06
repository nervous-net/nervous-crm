# Deployment Guide — Dossier (Nervous CRM)

## Architecture

- **Frontend**: React SPA hosted on Netlify (site name: `dossier`)
- **Backend**: Supabase (auth, database, RLS policies)
- **Error Tracking**: Sentry (React frontend)
- **Transactional Email**: Resend (for passwordless auth OTP)

## CRITICAL: Production Database

**NEVER flush, reset, or drop the production database.** Real user data is stored there.

- Use Supabase migrations for schema changes
- Always back up before running migrations
- Test migrations on local/staging first

## Pre-deployment

- [ ] All tests passing: `cd web && npm test`
- [ ] TypeScript compiles: `cd web && npm run typecheck`
- [ ] Build succeeds: `cd web && npm run build`

## Environment Variables

### Netlify Build Environment

Set these in the Netlify dashboard under **Site settings → Environment variables**:

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase dashboard → Settings → API |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking | Sentry → Project Settings → Client Keys |

All `VITE_` variables must be present at **build time** — they get baked into the frontend bundle.

### Supabase Configuration

Configured in the Supabase dashboard:

| Setting | Location |
|---------|----------|
| Auth providers (email OTP) | Authentication → Providers |
| Custom SMTP (Resend) | Project Settings → Auth → SMTP Settings |
| Database (Postgres + RLS) | Database → Tables |
| API keys | Settings → API |

## Deploy

Netlify auto-deploys from the `main` branch. Manual deploy:

```bash
cd web && npm run build
# Push to main — Netlify picks it up automatically
```

Or via Netlify CLI:

```bash
npx netlify-cli deploy --prod --dir=web/dist
```

## Netlify Configuration

`netlify.toml` handles build settings:

```toml
[build]
  base = "web"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

The SPA redirect ensures client-side routing works for all paths.

## Post-deployment

- [ ] Verify the site loads at `https://dossier.netlify.app` (or custom domain)
- [ ] Test magic link / OTP login flow
- [ ] Verify Sentry is receiving events (trigger a test error)
- [ ] Check Supabase auth logs for successful logins
- [ ] Verify RLS policies are enforced (try accessing another team's data)
