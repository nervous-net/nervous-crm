// ABOUTME: Authentication context using Supabase Auth
// ABOUTME: Manages user session state and provides auth methods throughout the app

import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  teamId: string;
  teamName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; teamName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserProfile(supabaseUser: SupabaseUser): Promise<User | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, teams(name)')
    .eq('id', supabaseUser.id)
    .single();

  if (profileError || !profile) {
    console.error('Failed to fetch profile:', profileError);
    return null;
  }

  const teamName = (profile.teams as { name: string } | null)?.name || 'Unknown Team';

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    teamId: profile.team_id,
    teamName,
    role: profile.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setUser(null);
      return;
    }

    const userProfile = await fetchUserProfile(session.user);
    setUser(userProfile);
  }, []);

  useEffect(() => {
    // Initial session check
    refreshUser().finally(() => setIsLoading(false));

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const userProfile = await fetchUserProfile(session.user);
          setUser(userProfile);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    // User will be set by onAuthStateChange listener
  };

  const register = async (data: { email: string; password: string; name: string; teamName: string }) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          team_name: data.teamName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    // User will be set by onAuthStateChange listener
    // Note: Depending on Supabase settings, user may need to confirm email first
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
