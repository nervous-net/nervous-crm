// ABOUTME: Hook for fetching the current user's profile and team data from the NS gateway.
// ABOUTME: Constructs profile from auth context user data and fetches org name via API.

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/supabase';

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

    async function fetchOrgName() {
      try {
        const org = await api.get<{ id: string; name: string }>('/api/team/org');
        setProfile({
          id: user!.id,
          email: user!.email,
          name: user!.name || user!.email,
          teamId: user!.org_id,
          teamName: org.name,
          role: user!.role,
        });
      } catch (err) {
        // Fall back to a placeholder org name if the API call fails
        const message = err instanceof Error ? err.message : 'Failed to fetch org';
        setError(message);
        setProfile({
          id: user!.id,
          email: user!.email,
          name: user!.name || user!.email,
          teamId: user!.org_id,
          teamName: 'My Organization',
          role: user!.role,
        });
      }
      setLoading(false);
    }

    fetchOrgName();
  }, [user]);

  return { profile, loading, error };
}
