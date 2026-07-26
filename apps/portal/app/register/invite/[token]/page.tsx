'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { CrossubLogo } from '@/components/brand/crossub-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import {
  completeAgentInviteRegistration,
  fetchAgentInvitePreview,
  registerAgentErrorMessage,
  type AgentInvitePreview,
} from '@/lib/agent-registration';
import { postAuthDestination } from '@/lib/system-access-agreement';
import { ApiError } from '@/lib/api';

export default function AgentInviteRegisterPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { refresh } = useAuth();
  const [invite, setInvite] = useState<AgentInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(
    null,
  );

  useEffect(() => {
    if (!token) return;
    fetchAgentInvitePreview(token)
      .then(setInvite)
      .catch((err) => {
        toast.error(registerAgentErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function onComplete() {
    if (!token || !acceptTerms) {
      toast.error('Please accept the terms and conditions to continue.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await completeAgentInviteRegistration(token, true);
      await refresh();
      if (result.temporaryPassword) {
        setCredentials({ email: result.user.email, password: result.temporaryPassword });
        toast.success('Account created — welcome email sent with your login details.');
      } else {
        toast.success('Account created — check your email for login details.');
        router.replace(
          postAuthDestination(
            result.user,
            ROUTES.DASHBOARD,
            ROUTES.SYSTEM_ACCESS_AGREEMENT,
            ROUTES.CHANGE_PASSWORD,
          ),
        );
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(registerAgentErrorMessage(err));
      } else {
        toast.error('Registration failed.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">This registration link is invalid.</p>
        <Link href={ROUTES.LOGIN} className="mt-4 text-primary hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (invite.expired || invite.used) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">
          {invite.used
            ? 'This registration link has already been used.'
            : 'This registration link has expired.'}
        </p>
        <Link href={ROUTES.LOGIN} className="mt-4 text-primary hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (credentials) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
          <div className="mb-4 flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="size-5" />
            <p className="font-medium">Registration complete</p>
          </div>
          <p className="text-muted-foreground text-sm">
            Your welcome email includes these login details. Please change your password after
            signing in.
          </p>
          <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3 font-mono text-sm">
            <p>Email: {credentials.email}</p>
            <p>Password: {credentials.password}</p>
          </div>
          <Button
            className="mt-6 w-full"
            onClick={() =>
              router.replace(
                postAuthDestination(
                  { mustChangePassword: true },
                  ROUTES.DASHBOARD,
                  ROUTES.SYSTEM_ACCESS_AGREEMENT,
                  ROUTES.CHANGE_PASSWORD,
                ),
              )
            }
          >
            Continue to Agent Portal
          </Button>
        </div>
      </div>
    );
  }

  const who = invite.contactName?.trim() || invite.email;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <CrossubLogo size="lg" showTagline />
        <p className="text-muted-foreground text-sm">Complete your registration</p>
      </div>

      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
        <p className="text-sm">
          Hi <strong>{who}</strong>, welcome to CROSSUB for{' '}
          <strong>{invite.agencyName}</strong>.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Accept the terms below to create your Agent Portal account. We will email your username
          and a temporary password immediately after registration.
        </p>

        <div className="mt-6 rounded-lg border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">System access agreement</p>
          <p className="mt-2">
            By registering you agree to use the CROSSUB platform in accordance with our terms of
            service, privacy policy, and agency management agreement. You are responsible for
            safeguarding your login credentials and all activity under your account.
          </p>
        </div>

        <div className="mt-4 flex items-start gap-2">
          <input
            id="acceptTerms"
            type="checkbox"
            className="mt-1 size-4 rounded border border-input"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <Label htmlFor="acceptTerms" className="text-sm leading-snug">
            I accept the CROSSUB terms &amp; conditions and system access agreement
          </Label>
        </div>

        <Button
          className="mt-6 w-full"
          disabled={!acceptTerms || submitting}
          onClick={() => void onComplete()}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Creating account...
            </>
          ) : (
            'Complete registration'
          )}
        </Button>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          Already registered?{' '}
          <Link href={ROUTES.LOGIN} className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
