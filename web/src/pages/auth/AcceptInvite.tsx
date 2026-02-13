// ABOUTME: Page for accepting team invitations via the NS gateway.
// ABOUTME: Authenticated users auto-accept; unauthenticated users are directed to log in first.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, try to accept the invite via the gateway
  useEffect(() => {
    if (!user || !token) return;

    setIsAccepting(true);
    api
      .post('/api/team/invites/accept', { token })
      .then(() => {
        toast({ title: 'Invite accepted!', description: 'Welcome to the team.' });
        navigate('/dashboard');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to accept invite');
        toast({
          title: 'Failed to accept invite',
          description: err instanceof Error ? err.message : 'Please try again.',
          variant: 'destructive',
        });
        setIsAccepting(false);
      });
  }, [user, token, navigate]);

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid Invite</CardTitle>
          <CardDescription>This invite link is not valid.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (user && isAccepting) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Accepting invite...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invite Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Invitation</CardTitle>
        <CardDescription>
          Log in or create an account to accept this invitation.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button onClick={() => navigate('/login')} className="w-full">
          Go to Login
        </Button>
      </CardFooter>
    </Card>
  );
}
