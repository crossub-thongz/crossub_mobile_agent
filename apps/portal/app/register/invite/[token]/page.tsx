'use client';

import { Check, CheckCircle2, Copy, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { CrossubLogo } from '@/components/brand/crossub-logo';
import {
  RegisterAgreementsSection,
  registerAgreementsReady,
} from '@/components/register/register-agreements-section';
import { RegisterPricingPanel } from '@/components/register/register-pricing-panel';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { AuthScreen, authPanelClass } from '@/lib/auth-page';
import {
  completeAgentInviteRegistration,
  fetchAgentInvitePreview,
  inviteToServiceAgreementPreview,
  registerAgentErrorMessage,
  type AgentInvitePreview,
} from '@/lib/agent-registration';
import { postAuthDestination } from '@/lib/system-access-agreement';
import { ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';
import type { AgentPortalServiceLevel } from '@/lib/portal-service-level';

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

export default function AgentInviteRegisterPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { refresh } = useAuth();
  const isV2 = useIsAgentUiV2();
  const [invite, setInvite] = useState<AgentInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptServiceAgreement, setAcceptServiceAgreement] = useState(false);
  const [acceptPrivacyAgreement, setAcceptPrivacyAgreement] = useState(false);
  const [portalServiceLevel, setPortalServiceLevel] =
    useState<AgentPortalServiceLevel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);

  const serviceAgreementSummary = useMemo(
    () => (invite ? inviteToServiceAgreementPreview(invite) : null),
    [invite],
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
    if (
      !token ||
      !registerAgreementsReady(acceptServiceAgreement, acceptPrivacyAgreement)
    ) {
      toast.error('Please accept the required agreements to continue.');
      return;
    }
    if (!portalServiceLevel) {
      toast.error('Please select Inspection Only Service or Full Service.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await completeAgentInviteRegistration(token, true, portalServiceLevel);
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
            Your account is ready. Choose a password on the next step to secure your Agent Portal
            access.
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
  const agreementsReady = registerAgreementsReady(
    acceptServiceAgreement,
    acceptPrivacyAgreement,
  );

  return (
    <AuthScreen isV2={isV2}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <CrossubLogo size="lg" showTagline />
        <p className="text-muted-foreground text-sm">Complete your registration</p>
      </div>

      <div className={authPanelClass(isV2, 'max-w-3xl')}>
        <p className="text-sm">
          Hi <strong>{who}</strong>, welcome to CROSSUB for{' '}
          <strong>{invite.agencyName}</strong>.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Choose your service plan, then accept the agreements below to create your Agent Portal
          account. You&apos;ll choose your password immediately after registration.
        </p>

        <div className="mt-6">
          <RegisterPricingPanel
            selectedLevel={portalServiceLevel}
            onSelectLevel={setPortalServiceLevel}
          />
        </div>

        {serviceAgreementSummary ? (
          <div className="mt-6">
            <RegisterAgreementsSection
              summary={serviceAgreementSummary}
              acceptServiceAgreement={acceptServiceAgreement}
              acceptPrivacyAgreement={acceptPrivacyAgreement}
              onAcceptServiceAgreementChange={setAcceptServiceAgreement}
              onAcceptPrivacyAgreementChange={setAcceptPrivacyAgreement}
              serviceAgreementHelpText="Checking this box pre-fills the Service Agreement with your invite and agency details from the sales onboarding record."
              showIntermediarySummary={false}
            />
          </div>
        ) : null}

        <Button
          className="mt-6 w-full"
          disabled={!agreementsReady || !portalServiceLevel || submitting}
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
