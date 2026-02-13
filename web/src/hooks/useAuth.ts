// ABOUTME: Convenience hook that provides the AuthContext value.
// ABOUTME: Throws if used outside of an AuthProvider.

import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
