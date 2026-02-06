-- ABOUTME: Adds RPC function for users to delete their own account.
-- ABOUTME: Handles team data cleanup and auth.users deletion with SECURITY DEFINER.

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _team_id UUID;
  _user_role TEXT;
  _team_member_count INT;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's team and role
  SELECT team_id, role INTO _team_id, _user_role
  FROM profiles WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Count team members
  SELECT COUNT(*) INTO _team_member_count
  FROM profiles WHERE team_id = _team_id;

  -- Block deletion if owner with other members still on the team
  IF _user_role = 'owner' AND _team_member_count > 1 THEN
    RAISE EXCEPTION 'Cannot delete account while team has other members. Remove all members or transfer ownership first.';
  END IF;

  IF _team_member_count = 1 THEN
    -- Sole member: delete all team data before removing the team
    DELETE FROM activities WHERE team_id = _team_id;
    DELETE FROM deals WHERE team_id = _team_id;
    DELETE FROM contacts WHERE team_id = _team_id;
    DELETE FROM companies WHERE team_id = _team_id;
    DELETE FROM invites WHERE team_id = _team_id;
    DELETE FROM audit_logs WHERE team_id = _team_id;
    DELETE FROM profiles WHERE id = _user_id;
    DELETE FROM teams WHERE id = _team_id;
  ELSE
    -- Non-owner leaving a team: just remove their profile
    DELETE FROM profiles WHERE id = _user_id;
  END IF;

  -- Delete the auth user (cascades handled by FK constraints)
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$ LANGUAGE plpgsql;
