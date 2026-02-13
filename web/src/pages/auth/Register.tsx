// ABOUTME: Registration page using NS gateway signup with magic link verification.
// ABOUTME: Two-step flow: name+email+org name, then token verification (auto-verifies in dev mode).

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

const RESEND_COOLDOWN_SECONDS = 60;

export default function Register() {
  const { verifyOtp } = useAuth();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSignup = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.post<{ message: string; _debug_token?: string }>(
        '/auth/signup',
        { email, name, org_name: orgName },
      );

      // In dev mode the gateway returns a debug token so we can auto-verify
      if (res._debug_token) {
        await verifyOtp(email, res._debug_token);
        return;
      }

      setStep('otp');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast({
        title: 'Failed to create account',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [email, name, orgName, verifyOtp]);

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      await verifyOtp(email, otpCode);
      // Don't navigate here — AuthLayout detects the user and redirects to /dashboard
    } catch (error) {
      toast({
        title: 'Verification failed',
        description: error instanceof Error ? error.message : 'Invalid code',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await handleSignup();
  };

  const isDetailsValid = name.trim() && email.trim() && orgName.trim();

  if (step === 'otp') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to {email}
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
              <Label htmlFor="otp">Verification token</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Paste token from email"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.trim())}
                autoFocus
              />
            </div>
            <p className="text-sm text-muted-foreground">
              You can also click the magic link in the email.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || !otpCode}>
              {isLoading ? 'Verifying...' : 'Verify'}
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
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => {
                  setStep('details');
                  setOtpCode('');
                }}
              >
                Use different email
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
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          No password needed — we'll send you a magic link
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
      >
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization name</Label>
            <Input
              id="orgName"
              placeholder="My Company"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading || !isDetailsValid}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
