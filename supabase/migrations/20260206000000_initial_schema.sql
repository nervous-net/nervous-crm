-- ABOUTME: Initial database schema for Dossier CRM.
-- ABOUTME: Creates all core tables, indexes, RLS policies, and auth trigger.

-- ============================================
-- Tables
-- ============================================

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

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_profiles_team_id ON profiles(team_id);
CREATE INDEX idx_companies_team_id ON companies(team_id);
CREATE INDEX idx_contacts_team_id ON contacts(team_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_deals_team_id ON deals(team_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_activities_team_id ON activities(team_id);
CREATE INDEX idx_activities_due_date ON activities(due_date);
CREATE INDEX idx_audit_logs_team_id ON audit_logs(team_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's team_id
CREATE OR REPLACE FUNCTION public.get_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Teams policies
CREATE POLICY "read_own_team" ON teams FOR SELECT USING (id = public.get_team_id());
CREATE POLICY "owner_update" ON teams FOR UPDATE USING (
  id = public.get_team_id() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
-- Allow insert during signup (the trigger creates the team)
CREATE POLICY "insert_team" ON teams FOR INSERT WITH CHECK (true);

-- Profiles policies
CREATE POLICY "read_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "read_team" ON profiles FOR SELECT USING (team_id = public.get_team_id());
CREATE POLICY "update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Companies policies
CREATE POLICY "team_select" ON companies FOR SELECT USING (team_id = public.get_team_id());
CREATE POLICY "team_insert" ON companies FOR INSERT WITH CHECK (team_id = public.get_team_id());
CREATE POLICY "team_update" ON companies FOR UPDATE USING (team_id = public.get_team_id());
CREATE POLICY "team_delete" ON companies FOR DELETE USING (team_id = public.get_team_id());

-- Contacts policies
CREATE POLICY "team_select" ON contacts FOR SELECT USING (team_id = public.get_team_id());
CREATE POLICY "team_insert" ON contacts FOR INSERT WITH CHECK (team_id = public.get_team_id());
CREATE POLICY "team_update" ON contacts FOR UPDATE USING (team_id = public.get_team_id());
CREATE POLICY "team_delete" ON contacts FOR DELETE USING (team_id = public.get_team_id());

-- Deals policies
CREATE POLICY "team_select" ON deals FOR SELECT USING (team_id = public.get_team_id());
CREATE POLICY "team_insert" ON deals FOR INSERT WITH CHECK (team_id = public.get_team_id());
CREATE POLICY "team_update" ON deals FOR UPDATE USING (team_id = public.get_team_id());
CREATE POLICY "team_delete" ON deals FOR DELETE USING (team_id = public.get_team_id());

-- Activities policies
CREATE POLICY "team_select" ON activities FOR SELECT USING (team_id = public.get_team_id());
CREATE POLICY "team_insert" ON activities FOR INSERT WITH CHECK (team_id = public.get_team_id());
CREATE POLICY "team_update" ON activities FOR UPDATE USING (team_id = public.get_team_id());
CREATE POLICY "team_delete" ON activities FOR DELETE USING (team_id = public.get_team_id());

-- Invites policies
CREATE POLICY "team_select" ON invites FOR SELECT USING (team_id = public.get_team_id());
CREATE POLICY "team_insert" ON invites FOR INSERT WITH CHECK (team_id = public.get_team_id());
CREATE POLICY "team_update" ON invites FOR UPDATE USING (team_id = public.get_team_id());

-- Audit logs policies
CREATE POLICY "team_select" ON audit_logs FOR SELECT USING (team_id = public.get_team_id());
CREATE POLICY "team_insert" ON audit_logs FOR INSERT WITH CHECK (team_id = public.get_team_id());

-- ============================================
-- Auth trigger for automatic profile creation
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Create a new team for the user
  INSERT INTO teams (name) VALUES (COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team'))
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

-- ============================================
-- Updated_at trigger for tables with that column
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
