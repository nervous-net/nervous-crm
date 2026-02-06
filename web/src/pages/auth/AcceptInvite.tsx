// ABOUTME: Page for accepting team invites via Supabase with passwordless OTP auth
// ABOUTME: Validates invite token, sends OTP, and creates user account on verification

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

const acceptInviteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

type AcceptInviteForm = z.infer<typeof acceptInviteSchema>;

interface InviteInfo {
  email: string;
  teamName: string;
  role: string;
  teamId: string;
}

const RESEND_COOLDOWN_SECONDS = 60;

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [userName, setUserName] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteForm>({
    resolver: zodResolver(acceptInviteSchema),
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError('Invalid invite link');
        setIsValidating(false);
        return;
      }

      try {
        // Find the invite by token
        const { data: invite, error: inviteError } = await supabase
          .from('invites')
          .select('*, teams(name)')
          .eq('token', token)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .single();

        if (inviteError || !invite) {
          setError('This invite link is invalid or has expired');
          setIsValidating(false);
          return;
        }

        const teamName = (invite.teams as { name: string } | null)?.name || 'Unknown Team';

        setInviteInfo({
          email: invite.email,
          teamName,
          role: invite.role,
          teamId: invite.team_id,
        });
      } catch {
        setError('This invite link is invalid or has expired');
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const sendInviteOtp = async () => {
    if (!inviteInfo) return;

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: inviteInfo.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + '/auth/callback',
        data: {
          name: userName,
          team_id: inviteInfo.teamId,
          role: inviteInfo.role,
        },
      },
    });

    if (otpError) {
      throw new Error(otpError.message);
    }
  };

  const onSubmit = async (data: AcceptInviteForm) => {
    if (!token || !inviteInfo) return;

    setIsLoading(true);
    setUserName(data.name);
    try {
      await sendInviteOtp();
      setStep('otp');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast({
        title: 'Failed to send code',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!token || !inviteInfo) return;

    setIsLoading(true);
    try {
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        email: inviteInfo.email,
        token: otpCode,
        type: 'email',
      });

      if (verifyError) {
        throw new Error(verifyError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to verify account');
      }

      // Upsert the profile with the correct team/role from the invite
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: inviteInfo.email,
          name: userName,
          team_id: inviteInfo.teamId,
          role: inviteInfo.role as 'admin' | 'member' | 'viewer',
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Mark the invite as accepted
      await supabase
        .from('invites')
        .update({ status: 'accepted' })
        .eq('token', token);

      toast({
        title: 'Welcome!',
        description: `You've joined ${inviteInfo.teamName}.`,
      });
      navigate('/');
    } catch (err) {
      toast({
        title: 'Verification failed',
        description: err instanceof Error ? err.message : 'Invalid code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      await sendInviteOtp();
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast({
        title: 'Failed to resend code',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !inviteInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid Invite</CardTitle>
          <CardDescription>{error || 'This invite link is not valid'}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'otp') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to {inviteInfo.email}
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyOtp();
          }}
        >
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            <p className="text-sm text-muted-foreground">
              You can also click the magic link in the email.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || otpCode.length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify & join team'}
            </Button>
            <div className="flex items-center justify-between w-full text-sm">
              <button
                type="button"
                className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                onClick={handleResend}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join {inviteInfo.teamName}</CardTitle>
        <CardDescription>
          You've been invited to join as a {inviteInfo.role}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={inviteInfo.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending code...' : 'Accept Invite'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
