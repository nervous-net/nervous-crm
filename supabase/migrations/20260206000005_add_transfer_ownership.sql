-- ABOUTME: Adds RPC function for team owners to transfer ownership to another member.
-- ABOUTME: Atomically swaps owner to admin and promotes target to owner, bypassing profile UPDATE RLS.

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

  -- Get caller's team and role
  SELECT team_id, role INTO _caller_team_id, _caller_role
  FROM profiles WHERE id = _caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF _caller_role != 'owner' THEN
    RAISE EXCEPTION 'Only the team owner can transfer ownership';
  END IF;

  -- Get target's team and role
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

  -- Atomic swap: promote target, demote caller
  UPDATE profiles SET role = 'owner' WHERE id = new_owner_id;
  UPDATE profiles SET role = 'admin' WHERE id = _caller_id;
END;
$$ LANGUAGE plpgsql;
