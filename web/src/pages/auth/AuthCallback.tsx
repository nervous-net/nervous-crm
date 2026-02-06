// ABOUTME: Handles magic link redirects from Supabase email OTP auth
// ABOUTME: Exchanges the PKCE code from the URL for a session, then redirects

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      // Supabase PKCE flow puts the code in the URL query params
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          navigate('/dashboard', { replace: true });
          return;
        }
        console.error('Code exchange failed:', error);
      }

      // Also handle hash-based redirects (older Supabase flows)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');

      if (accessToken) {
        // Hash-based flow: Supabase client auto-detects and sets session
        // Wait for onAuthStateChange to fire
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN') {
            subscription.unsubscribe();
            navigate('/dashboard', { replace: true });
          }
        });

        // Fallback timeout
        setTimeout(() => {
          subscription.unsubscribe();
          navigate('/login', { replace: true });
        }, 5000);
        return;
      }

      // No code or token found — redirect to login
      navigate('/login', { replace: true });
    }

    handleCallback();
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
