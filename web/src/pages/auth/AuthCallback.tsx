// ABOUTME: Handles magic link redirects from Supabase email OTP auth
// ABOUTME: Waits for Supabase to detect the session from the URL hash, then redirects to dashboard

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Redirect to dashboard once user is authenticated
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Fallback: if nothing happens after 10 seconds, redirect to login
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 10000);
    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
