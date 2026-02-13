// ABOUTME: Passwordless login page using NS gateway magic link auth.
// ABOUTME: Two-step flow: email entry, then token verification (auto-verifies in dev mode).

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

const RESEND_COOLDOWN_SECONDS = 60;

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
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

  const handleSendOtp = useCallback(async () => {
    setIsLoading(true);
    try {
      const { debugToken } = await sendOtp(email);

      // In dev mode the gateway returns a debug token so we can auto-verify
      if (debugToken) {
        await verifyOtp(email, debugToken);
        return;
      }

      setStep('otp');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast({
        title: 'Failed to send code',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [email, sendOtp, verifyOtp]);

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
    await handleSendOtp();
  };

  if (step === 'otp') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to {email}
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
                  setStep('email');
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
        <CardTitle>Sign in to your account</CardTitle>
        <CardDescription>
          We'll send you a magic link to sign in — no password needed
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendOtp();
        }}
      >
        <CardContent className="space-y-4">
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
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading || !email}>
            {isLoading ? 'Sending...' : 'Send magic link'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
