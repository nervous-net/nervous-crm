-- ABOUTME: Complete Supabase schema for Nervous CRM
-- ABOUTME: Run this in Supabase SQL Editor to set up tables, RLS, and triggers

-- ============================================
-- TABLES
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
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'call', 'email', 'meeting')),
  subject TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deal Notes
CREATE TABLE deal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deal Members (junction table)
CREATE TABLE deal_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deal_id, profile_id)
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
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_team_id ON profiles(team_id);
CREATE INDEX idx_companies_team_id ON companies(team_id);
CREATE INDEX idx_companies_deleted_at ON companies(deleted_at);
CREATE INDEX idx_contacts_team_id ON contacts(team_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at);
CREATE INDEX idx_deals_team_id ON deals(team_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_deleted_at ON deals(deleted_at);
CREATE INDEX idx_activities_team_id ON activities(team_id);
CREATE INDEX idx_activities_due_date ON activities(due_date);
CREATE INDEX idx_activities_deal_id ON activities(deal_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_assigned_to ON activities(assigned_to);
CREATE INDEX idx_deal_notes_team_id ON deal_notes(team_id);
CREATE INDEX idx_deal_notes_deal_id ON deal_notes(deal_id);
CREATE INDEX idx_deal_members_team_id ON deal_members(team_id);
CREATE INDEX idx_deal_members_deal_id ON deal_members(deal_id);
CREATE INDEX idx_deal_members_profile_id ON deal_members(profile_id);
CREATE INDEX idx_audit_logs_team_id ON audit_logs(team_id);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_team_id ON invites(team_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get user's team_id
-- ============================================

CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- RLS POLICIES: Teams
-- ============================================

CREATE POLICY "Users can read their own team"
  ON teams FOR SELECT
  USING (id = get_my_team_id());

CREATE POLICY "Owners can update their team"
  ON teams FOR UPDATE
  USING (
    id = get_my_team_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ============================================
-- RLS POLICIES: Profiles
-- ============================================

CREATE POLICY "Users can read profiles in their team"
  ON profiles FOR SELECT
  USING (team_id = get_my_team_id() OR id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================
-- RLS POLICIES: Companies
-- ============================================

CREATE POLICY "Team members can read companies"
  ON companies FOR SELECT
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can insert companies"
  ON companies FOR INSERT
  WITH CHECK (team_id = get_my_team_id());

CREATE POLICY "Team members can update companies"
  ON companies FOR UPDATE
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can delete companies"
  ON companies FOR DELETE
  USING (team_id = get_my_team_id());

-- ============================================
-- RLS POLICIES: Contacts
-- ============================================

CREATE POLICY "Team members can read contacts"
  ON contacts FOR SELECT
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can insert contacts"
  ON contacts FOR INSERT
  WITH CHECK (team_id = get_my_team_id());

CREATE POLICY "Team members can update contacts"
  ON contacts FOR UPDATE
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can delete contacts"
  ON contacts FOR DELETE
  USING (team_id = get_my_team_id());

-- ============================================
-- RLS POLICIES: Deals
-- ============================================

CREATE POLICY "Team members can read deals"
  ON deals FOR SELECT
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can insert deals"
  ON deals FOR INSERT
  WITH CHECK (team_id = get_my_team_id());

CREATE POLICY "Team members can update deals"
  ON deals FOR UPDATE
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can delete deals"
  ON deals FOR DELETE
  USING (team_id = get_my_team_id());

-- ============================================
-- RLS POLICIES: Activities
-- ============================================

CREATE POLICY "Team members can read activities"
  ON activities FOR SELECT
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can insert activities"
  ON activities FOR INSERT
  WITH CHECK (team_id = get_my_team_id());

CREATE POLICY "Team members can update activities"
  ON activities FOR UPDATE
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can delete activities"
  ON activities FOR DELETE
  USING (team_id = get_my_team_id());

-- ============================================
-- RLS POLICIES: Deal Notes
-- ============================================

CREATE POLICY "Team members can read deal notes"
  ON deal_notes FOR SELECT
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can insert deal notes"
  ON deal_notes FOR INSERT
  WITH CHECK (team_id = get_my_team_id());

CREATE POLICY "Team members can update deal notes"
  ON deal_notes FOR UPDATE
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can delete deal notes"
  ON deal_notes FOR DELETE
  USING (team_id = get_my_team_id());

-- ============================================
-- RLS POLICIES: Deal Members
-- ============================================

CREATE POLICY "Team members can read deal members"
  ON deal_members FOR SELECT
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can insert deal members"
  ON deal_members FOR INSERT
  WITH CHECK (team_id = get_my_team_id());

CREATE POLICY "Team members can delete deal members"
  ON deal_members FOR DELETE
  USING (team_id = get_my_team_id());

-- ============================================
-- RLS POLICIES: Invites
-- ============================================

CREATE POLICY "Team admins can read invites"
  ON invites FOR SELECT
  USING (
    team_id = get_my_team_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Anyone can read pending invites"
  ON invites FOR SELECT
  USING (status = 'pending' AND expires_at > now());

CREATE POLICY "Team admins can create invites"
  ON invites FOR INSERT
  WITH CHECK (
    team_id = get_my_team_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Team admins can update invites"
  ON invites FOR UPDATE
  USING (
    team_id = get_my_team_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Invitees can accept their own invite"
  ON invites FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND email = auth.jwt()->>'email'
    AND status = 'pending'
  );

-- ============================================
-- RLS POLICIES: Audit Logs
-- ============================================

CREATE POLICY "Team members can read audit logs"
  ON audit_logs FOR SELECT
  USING (team_id = get_my_team_id());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (team_id = get_my_team_id());

-- ============================================
-- AUTH TRIGGER: Create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team_id UUID;
  invite_team_id UUID;
  user_name_val TEXT;
  user_role_val TEXT;
BEGIN
  user_name_val := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);

  -- Check if this user was invited to an existing team
  invite_team_id := (NEW.raw_user_meta_data->>'team_id')::UUID;

  IF invite_team_id IS NOT NULL THEN
    -- Invited user: join the existing team with the invited role
    user_role_val := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

    INSERT INTO profiles (id, email, name, role, team_id)
    VALUES (NEW.id, NEW.email, user_name_val, user_role_val, invite_team_id);
  ELSE
    -- Regular signup: create a new team
    INSERT INTO teams (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team'))
    RETURNING id INTO new_team_id;

    INSERT INTO profiles (id, email, name, role, team_id)
    VALUES (NEW.id, NEW.email, user_name_val, 'owner', new_team_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_companies
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_contacts
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_deals
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RPC: Transfer team ownership
-- ============================================

CREATE OR REPLACE FUNCTION transfer_ownership(new_owner_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID := auth.uid();
  _caller_team_id UUID;
  _caller_role TEXT;
  _target_team_id UUID;
  _target_role TEXT;
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT team_id, role INTO _caller_team_id, _caller_role
  FROM profiles WHERE id = _caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF _caller_role != 'owner' THEN
    RAISE EXCEPTION 'Only the team owner can transfer ownership';
  END IF;

  SELECT team_id, role INTO _target_team_id, _target_role
  FROM profiles WHERE id = new_owner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  IF _target_team_id != _caller_team_id THEN
    RAISE EXCEPTION 'Target user is not on your team';
  END IF;

  IF _target_role = 'owner' THEN
    RAISE EXCEPTION 'Target user is already the owner';
  END IF;

  UPDATE profiles SET role = 'owner' WHERE id = new_owner_id;
  UPDATE profiles SET role = 'admin' WHERE id = _caller_id;
END;
$$ LANGUAGE plpgsql;
