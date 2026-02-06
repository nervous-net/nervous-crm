# Supabase Migration Design

## Overview

Migrate Nervous CRM from custom Fastify backend + Prisma to Supabase (auth + database), deployed as a frontend-only app on Netlify.

## Architecture

**Before:**
```
Browser → Netlify (React) → Fly.io (Fastify API) → PostgreSQL
                              ↓
                         JWT Auth
                         Prisma ORM
                         Business Logic
```

**After:**
```
Browser → Netlify (React) → Supabase
                              ↓
                         Supabase Auth
                         Supabase Database (PostgreSQL + RLS)
                         Supabase JS Client
```

## Supabase Project

- URL: `https://ophighfxmohqznbqgxyj.supabase.co`
- Anon Key: `sb_publishable_fS_gAVznEzzLdepi0kKbTA_g6dCwFd9`

## Database Schema

### Tables

```sql
-- Teams (multi-tenancy root)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Deals
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  value DECIMAL(15,2),
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  expected_close DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'call', 'email', 'meeting')),
  subject TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invites
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes

```sql
CREATE INDEX idx_profiles_team_id ON profiles(team_id);
CREATE INDEX idx_companies_team_id ON companies(team_id);
CREATE INDEX idx_contacts_team_id ON contacts(team_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_deals_team_id ON deals(team_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_activities_team_id ON activities(team_id);
CREATE INDEX idx_activities_due_date ON activities(due_date);
CREATE INDEX idx_audit_logs_team_id ON audit_logs(team_id);
```

## Row Level Security Policies

### Enable RLS on all tables

```sql
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### Helper function to get user's team_id

```sql
CREATE OR REPLACE FUNCTION auth.team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

### Policies for CRM tables (companies, contacts, deals, activities)

```sql
-- Companies
CREATE POLICY "team_select" ON companies FOR SELECT USING (team_id = auth.team_id());
CREATE POLICY "team_insert" ON companies FOR INSERT WITH CHECK (team_id = auth.team_id());
CREATE POLICY "team_update" ON companies FOR UPDATE USING (team_id = auth.team_id());
CREATE POLICY "team_delete" ON companies FOR DELETE USING (team_id = auth.team_id());

-- Contacts
CREATE POLICY "team_select" ON contacts FOR SELECT USING (team_id = auth.team_id());
CREATE POLICY "team_insert" ON contacts FOR INSERT WITH CHECK (team_id = auth.team_id());
CREATE POLICY "team_update" ON contacts FOR UPDATE USING (team_id = auth.team_id());
CREATE POLICY "team_delete" ON contacts FOR DELETE USING (team_id = auth.team_id());

-- Deals
CREATE POLICY "team_select" ON deals FOR SELECT USING (team_id = auth.team_id());
CREATE POLICY "team_insert" ON deals FOR INSERT WITH CHECK (team_id = auth.team_id());
CREATE POLICY "team_update" ON deals FOR UPDATE USING (team_id = auth.team_id());
CREATE POLICY "team_delete" ON deals FOR DELETE USING (team_id = auth.team_id());

-- Activities
CREATE POLICY "team_select" ON activities FOR SELECT USING (team_id = auth.team_id());
CREATE POLICY "team_insert" ON activities FOR INSERT WITH CHECK (team_id = auth.team_id());
CREATE POLICY "team_update" ON activities FOR UPDATE USING (team_id = auth.team_id());
CREATE POLICY "team_delete" ON activities FOR DELETE USING (team_id = auth.team_id());
```

### Policies for profiles

```sql
-- Users can read their own profile
CREATE POLICY "read_own" ON profiles FOR SELECT USING (id = auth.uid());

-- Users can read profiles in their team
CREATE POLICY "read_team" ON profiles FOR SELECT USING (team_id = auth.team_id());

-- Users can update their own profile
CREATE POLICY "update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- Allow insert during signup (handled by trigger)
CREATE POLICY "insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
```

### Policies for teams

```sql
-- Users can read their own team
CREATE POLICY "read_own_team" ON teams FOR SELECT USING (id = auth.team_id());

-- Owners can update their team
CREATE POLICY "owner_update" ON teams FOR UPDATE USING (
  id = auth.team_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
```

## Auth Trigger for Profile Creation

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Create a new team for the user
  INSERT INTO teams (name) VALUES (NEW.raw_user_meta_data->>'team_name')
  RETURNING id INTO new_team_id;

  -- Create the profile
  INSERT INTO profiles (id, email, name, role, team_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'owner',
    new_team_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Frontend Changes

### New files

- `web/src/lib/supabase.ts` - Supabase client initialization

### Modified files

- `web/src/contexts/AuthContext.tsx` - Use Supabase Auth
- `web/src/lib/api.ts` - Replace with Supabase queries
- `web/src/pages/*.tsx` - Update data fetching
- `web/src/hooks/*.ts` - Update React Query hooks
- `web/.env.example` - Add Supabase env vars
- `web/vite.config.ts` - Update env handling if needed

### Deleted files

- Entire `src/` directory
- `prisma/` directory
- `Dockerfile`
- `fly.toml`
- Root-level backend configs

## Deployment

### Netlify Configuration

```toml
[build]
  command = "npm run build -w web"
  publish = "web/dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Environment Variables

```
VITE_SUPABASE_URL=https://ophighfxmohqznbqgxyj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_fS_gAVznEzzLdepi0kKbTA_g6dCwFd9
```

## Implementation Order

1. Set up Supabase schema (tables, indexes)
2. Create RLS policies
3. Create auth trigger for profile creation
4. Install Supabase JS client in frontend
5. Create Supabase client file
6. Rewrite AuthContext for Supabase Auth
7. Update data fetching layer
8. Update all pages/hooks to use new data layer
9. Update environment configuration
10. Remove backend code and configs
11. Test locally
12. Deploy to Netlify
