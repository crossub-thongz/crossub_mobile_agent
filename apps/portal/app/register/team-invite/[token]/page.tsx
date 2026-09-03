'use client';

import { Check, CheckCircle2, Copy, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { CrossubLogo } from '@/components/brand/crossub-logo';
import { RegisterTermsAgreementCard } from '@/components/register/register-terms-agreement';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { AuthScreen, authPanelClass } from '@/lib/auth-page';
import {
  completeAgencyAgentInviteRegistration,
  fetchAgencyAgentInvitePreview,
  registerAgentErrorMessage,
  type AgentInvitePreview,
} from '@/lib/agent-registration';
import { postAuthDestination } from '@/lib/system-access-agreement';
import { ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';
import {
  PORTAL_SERVICE_LEVEL_LABEL,
  PORTAL_SERVICE_LEVEL_TAG,
} from '@/lib/portal-service-level';

function EmailCopyRow({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success('Email copied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy email');
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="min-w-0 truncate">Email: {email}</p>
      <button
        type="button"
        onClick={() => void copy()}
        className="text-muted-foreground shrink-0 rounded-md p-1 hover:bg-muted/50 hover:text-foreground"
        aria-label="Copy email"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

export default function AgencyTeamInviteRegisterPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { refresh } = useAuth();
  const isV2 = useIsAgentUiV2();
  const [invite, setInvite] = useState<AgentInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchAgencyAgentInvitePreview(token)
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
      const result = await completeAgencyAgentInviteRegistration(token, true);
      await refresh();
      setRegisteredUser(result.user);
      toast.success('Account created — choose your password to continue.');
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
      <AuthScreen isV2={isV2}>
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </AuthScreen>
    );
  }

  if (!invite) {
    return (
      <AuthScreen isV2={isV2} className="text-center">
        <p className="text-muted-foreground">This registration link is invalid.</p>
        <Link href={ROUTES.LOGIN} className="mt-4 text-primary hover:underline">
          Sign in
        </Link>
      </AuthScreen>
    );
  }

  if (invite.expired || invite.used) {
    return (
      <AuthScreen isV2={isV2} className="text-center">
        <p className="text-muted-foreground">
          {invite.used
            ? 'This registration link has already been used.'
            : 'This registration link has expired.'}
        </p>
        <Link href={ROUTES.LOGIN} className="mt-4 text-primary hover:underline">
          Sign in
        </Link>
      </AuthScreen>
    );
  }

  if (registeredUser) {
    return (
      <AuthScreen isV2={isV2}>
        <div className={authPanelClass(isV2, 'max-w-md')}>
          <div className="mb-4 flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="size-5" />
            <p className="font-medium">Registration complete</p>
          </div>
          <p className="text-muted-foreground text-sm">
            You&apos;ve joined the agency team. Choose a password on the next step.
          </p>
          <div className="mt-4 rounded-lg border bg-muted/30 p-3 font-mono text-sm">
            <EmailCopyRow email={registeredUser.email} />
          </div>
          <Button
            className="mt-6 w-full"
            onClick={() =>
              router.replace(
                postAuthDestination(
                  registeredUser,
                  ROUTES.DASHBOARD,
                  ROUTES.SYSTEM_ACCESS_AGREEMENT,
                  ROUTES.CHANGE_PASSWORD,
                ),
              )
            }
          >
            Choose password
          </Button>
        </div>
      </AuthScreen>
    );
  }

  const who = invite.contactName?.trim() || invite.email;

  return (
    <AuthScreen isV2={isV2}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <CrossubLogo size="lg" showTagline />
        <p className="text-muted-foreground text-sm">Join your agency team</p>
      </div>

      <div className={authPanelClass(isV2, 'max-w-md')}>
        <p className="text-sm">
          Hi <strong>{who}</strong>, you&apos;ve been invited to join{' '}
          <strong>{invite.agencyName}</strong> on CROSSUB.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Accept the terms below to create your agent account. You&apos;ll see properties assigned
          to you by your agency principal.
        </p>
        {invite.portalServiceLevel ? (
          <p className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
            Account level:{' '}
            <strong>
              {PORTAL_SERVICE_LEVEL_TAG[invite.portalServiceLevel]} ·{' '}
              {PORTAL_SERVICE_LEVEL_LABEL[invite.portalServiceLevel]}
            </strong>
            . Same as the agency primary — you do not choose a service plan.
          </p>
        ) : null}

        <RegisterTermsAgreementCard />

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
    </AuthScreen>
  );
}
