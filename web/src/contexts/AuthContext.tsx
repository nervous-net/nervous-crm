import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

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
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; teamName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      setAuthError(null);
      const response = await api.get<{ data: User }>('/users/me');
      setUser(response.data);
    } catch (error) {
      // Only clear user on 401 (unauthorized), not on network errors
      if (error instanceof Error && error.message === 'Authentication required') {
        setUser(null);
      } else {
        // Network or other error - keep user state but show error
        setAuthError('Unable to connect to server');
      }
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ data: { user: User } }>('/auth/login', { email, password });
    setUser(response.data.user);
  };

  const register = async (data: { email: string; password: string; name: string; teamName: string }) => {
    const response = await api.post<{ data: { user: User } }>('/auth/register', data);
    setUser(response.data.user);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, authError, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
