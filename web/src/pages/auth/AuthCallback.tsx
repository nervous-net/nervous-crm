// ABOUTME: Handles magic link redirects from Supabase email OTP auth
// ABOUTME: Waits for Supabase to detect the session from the URL hash, then redirects to dashboard

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // With implicit flow, Supabase auto-detects the access_token in the URL hash
    // via detectSessionInUrl: true. We just listen for the auth state change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        subscription.unsubscribe();
        navigate('/dashboard', { replace: true });
      }
    });

    // Also check if there's already an active session (in case the event fired before we subscribed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        navigate('/dashboard', { replace: true });
      }
    });

    // Fallback: if nothing happens after 10 seconds, redirect to login
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      console.error('Auth callback timed out — no session detected');
      navigate('/login', { replace: true });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
