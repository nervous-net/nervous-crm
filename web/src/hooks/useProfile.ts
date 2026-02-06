// ABOUTME: Hook for fetching the current user's profile and team data from Supabase
// ABOUTME: Separated from auth context to avoid race conditions during login flow

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface Profile {
  id: string;
  email: string;
  name: string;
  teamId: string;
  teamName: string;
  role: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, teams(name)')
        .eq('id', user!.id)
        .single();

      if (error) {
        console.error('Failed to fetch profile:', error);
        setError(error.message);
      } else {
        const teamName = (data.teams as { name: string } | null)?.name || 'Unknown Team';
        setProfile({
          id: data.id,
          email: data.email,
          name: data.name,
          teamId: data.team_id,
          teamName,
          role: data.role,
        });
        setError(null);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [user]);

  return { profile, loading, error };
}
