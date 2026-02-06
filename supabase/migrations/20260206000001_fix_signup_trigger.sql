-- ABOUTME: Fixes the signup trigger to bypass RLS when creating teams and profiles.
-- ABOUTME: The trigger runs before auth.uid() is available, so it needs SECURITY DEFINER + search_path.

-- Recreate the function with proper permissions to bypass RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Create a new team for the user (bypasses RLS via SECURITY DEFINER)
  INSERT INTO teams (name) VALUES (COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team'))
  RETURNING id INTO new_team_id;

  -- Create the profile (bypasses RLS via SECURITY DEFINER)
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
$$ LANGUAGE plpgsql;

-- Grant necessary permissions to the auth trigger
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.teams TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
