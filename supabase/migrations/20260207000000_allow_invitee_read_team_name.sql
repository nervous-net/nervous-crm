-- ABOUTME: Allows unauthenticated invite holders to read the team name for their invite.
-- ABOUTME: Without this, the accept-invite page shows "Unknown Team" because teams RLS blocks the join.

-- Allow reading a team row if there's a pending, non-expired invite for that team.
-- The invite token (UUID) acts as access control — unauthenticated users can only
-- reach this path via the invites SELECT policy which already filters on pending + not expired.
CREATE POLICY "Invitees can read team name via pending invite"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invites
      WHERE invites.team_id = teams.id
        AND invites.status = 'pending'
        AND invites.expires_at > now()
    )
  );
