# Deployment Checklist

## CRITICAL: Production Database

**NEVER flush, reset, or drop the production database.** Real user data is stored there.

- Use `prisma migrate deploy` for schema changes (not `prisma db push`)
- Always back up before running migrations
- Test migrations on local/staging first

## Pre-deployment

- [ ] All tests passing: `npm run test:run`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build && npm run build -w web`

## Environment Variables

Set these secrets in Fly.io:

- `DATABASE_URL` - Automatically set by Fly Postgres
- `JWT_SECRET` - Run `openssl rand -hex 32`
- `JWT_REFRESH_SECRET` - Run `openssl rand -hex 32`
- `COOKIE_SECRET` - Run `openssl rand -hex 32`
- `FRONTEND_URL` - Your production URL (e.g., https://nervous-crm.fly.dev)

## Deploy Commands

```bash
# Login to Fly
fly auth login

# Create app
fly apps create nervous-crm

# Create Postgres database
fly postgres create --name nervous-crm-db

# Attach database to app
fly postgres attach nervous-crm-db

# Set secrets
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set JWT_REFRESH_SECRET=$(openssl rand -hex 32)
fly secrets set COOKIE_SECRET=$(openssl rand -hex 32)

# Deploy
fly deploy

# Run migrations
fly ssh console -C "npx prisma migrate deploy"

# View logs
fly logs

# SSH into machine
fly ssh console

# Scale
fly scale count 2
```

## Post-deployment

- [ ] Verify health endpoint: `curl https://nervous-crm.fly.dev/health`
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Verify all pages load
