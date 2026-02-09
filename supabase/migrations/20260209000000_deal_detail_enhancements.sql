-- ABOUTME: Adds assigned_to on activities, deal_notes table, and deal_members junction table
-- ABOUTME: Supports deal detail enhancements with notes, team members, and activity assignment

-- ============================================
-- 1. Add assigned_to to activities
-- ============================================

ALTER TABLE activities ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX idx_activities_assigned_to ON activities(assigned_to);

-- ============================================
-- 2. Deal notes table
-- ============================================

CREATE TABLE deal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_notes_team_id ON deal_notes(team_id);
CREATE INDEX idx_deal_notes_deal_id ON deal_notes(deal_id);

ALTER TABLE deal_notes ENABLE ROW LEVEL SECURITY;

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
-- 3. Deal members junction table
-- ============================================

CREATE TABLE deal_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deal_id, profile_id)
);

CREATE INDEX idx_deal_members_team_id ON deal_members(team_id);
CREATE INDEX idx_deal_members_deal_id ON deal_members(deal_id);
CREATE INDEX idx_deal_members_profile_id ON deal_members(profile_id);

ALTER TABLE deal_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read deal members"
  ON deal_members FOR SELECT
  USING (team_id = get_my_team_id());

CREATE POLICY "Team members can insert deal members"
  ON deal_members FOR INSERT
  WITH CHECK (team_id = get_my_team_id());

CREATE POLICY "Team members can delete deal members"
  ON deal_members FOR DELETE
  USING (team_id = get_my_team_id());
