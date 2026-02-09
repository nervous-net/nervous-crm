-- ABOUTME: Fix foreign keys to reference profiles instead of auth.users
-- ABOUTME: Allows PostgREST/Supabase to resolve joins through profiles table

-- deal_notes.author_id should reference profiles for PostgREST joins
ALTER TABLE deal_notes DROP CONSTRAINT deal_notes_author_id_fkey;
ALTER TABLE deal_notes ADD CONSTRAINT deal_notes_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- deal_members.profile_id should reference profiles for PostgREST joins
ALTER TABLE deal_members DROP CONSTRAINT deal_members_profile_id_fkey;
ALTER TABLE deal_members ADD CONSTRAINT deal_members_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- activities.assigned_to should reference profiles for PostgREST joins
ALTER TABLE activities DROP CONSTRAINT activities_assigned_to_fkey;
ALTER TABLE activities ADD CONSTRAINT activities_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;
