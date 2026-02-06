// ABOUTME: Passwordless registration page using email OTP (6-digit code or magic link)
// ABOUTME: Two-step flow: name+email+team → OTP code verification

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

const RESEND_COOLDOWN_SECONDS = 60;

export default function Register() {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
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
      await sendOtp(email, { name, team_name: teamName });
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
  }, [email, name, teamName, sendOtp]);

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

  const isDetailsValid = name.trim() && email.trim() && teamName.trim();

  if (step === 'otp') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to {email}
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
              {isLoading ? 'Verifying...' : 'Verify code'}
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
          No password needed — we'll send you a sign-in code
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
            <Label htmlFor="teamName">Team name</Label>
            <Input
              id="teamName"
              placeholder="My Company"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading || !isDetailsValid}>
            {isLoading ? 'Sending code...' : 'Create account'}
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
