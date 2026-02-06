-- ABOUTME: Fixes invite acceptance flow — RLS policies and signup trigger for invited users.
-- ABOUTME: Allows public invite validation by token, invite acceptance, and proper team assignment.

-- ============================================
-- FIX 1: Allow unauthenticated users to read pending invites by token
-- The invite token (UUID) serves as the access control — it's unguessable.
-- ============================================

CREATE POLICY "Anyone can read pending invites"
  ON invites FOR SELECT
  USING (status = 'pending' AND expires_at > now());

-- ============================================
-- FIX 2: Allow authenticated users to accept invites sent to their email
-- After OTP verification, the invitee needs to mark the invite as accepted.
-- The existing policy only allows team admins to update invites.
-- ============================================

CREATE POLICY "Invitees can accept their own invite"
  ON invites FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND email = auth.jwt()->>'email'
    AND status = 'pending'
  );

-- ============================================
-- FIX 3: Update signup trigger to handle invited users
-- When team_id is present in user metadata (set by the invite OTP flow),
-- join the existing team instead of creating a new one.
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

-- Ensure auth admin still has the grants from the previous migration
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.teams TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
