-- ABOUTME: Backfills profiles and teams for auth users who registered before trigger was fixed.
-- ABOUTME: Creates a team and owner profile for any auth.users row missing a profiles row.

DO $$
DECLARE
  u RECORD;
  new_team_id UUID;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.teams (name)
    VALUES (COALESCE(u.raw_user_meta_data->>'team_name', 'My Team'))
    RETURNING id INTO new_team_id;

    INSERT INTO public.profiles (id, email, name, role, team_id)
    VALUES (
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'name', u.email),
      'owner',
      new_team_id
    );
  END LOOP;
END;
$$;
