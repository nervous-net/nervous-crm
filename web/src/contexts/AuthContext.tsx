// ABOUTME: Authentication context using Nervous System gateway magic link auth.
// ABOUTME: Manages user state and provides passwordless auth methods throughout the app.

import { createContext, useState, useEffect, type ReactNode } from 'react';
import {
  api,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
} from '@/lib/supabase';

export interface NSUser {
  id: string;
  email: string;
  org_id: string;
  role: string;
  name?: string;
}

interface AuthContextType {
  user: NSUser | null;
  isLoading: boolean;
  sendOtp: (email: string) => Promise<{ debugToken?: string }>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NSUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      const stored = getStoredUser();
      if (stored) {
        setUser(stored);
      }
    }
    setIsLoading(false);
  }, []);

  const sendOtp = async (email: string): Promise<{ debugToken?: string }> => {
    const res = await api.post<{ message: string; _debug_token?: string }>(
      '/auth/login',
      { email },
    );
    return { debugToken: res._debug_token };
  };

  const verifyOtp = async (email: string, token: string) => {
    const res = await api.post<{ token: string; user_id: string; org_id: string }>(
      '/auth/verify',
      { token },
    );

    const nsUser: NSUser = {
      id: res.user_id,
      email,
      org_id: res.org_id,
      role: 'member',
    };

    setStoredAuth(res.token, nsUser);
    setUser(nsUser);
  };

  const logout = async () => {
    clearStoredAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
