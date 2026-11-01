'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES } from '@/constants/routes';
import { ApiError, api } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';
import { postAuthDestination } from '@/lib/system-access-agreement';

const AGENT_GREEN = '#00bd85';

type SetupStart = { secret: string; otpauthUrl: string };

export default function MfaSetupPage() {
  const router = useRouter();
  const { adoptUser, user } = useAuth();
  const [setup, setSetup] = useState<SetupStart | null>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await api.post<SetupStart>('/auth/mfa/setup');
        if (!cancelled) setSetup(result);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : 'Could not start MFA setup.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const result = await api.post<{ user: AuthUser; recoveryCodes: string[] }>(
        '/auth/mfa/confirm',
        { code },
      );
      adoptUser(result.user);
      setRecoveryCodes(result.recoveryCodes);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That code is not valid.');
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    if (!user) {
      router.replace(ROUTES.DASHBOARD);
      return;
    }
    router.replace(
      postAuthDestination(
        { ...user, mfaEnrollmentRequired: false, mfaChallengeRequired: false },
        ROUTES.DASHBOARD,
        ROUTES.SYSTEM_ACCESS_AGREEMENT,
        ROUTES.CHANGE_PASSWORD,
      ),
    );
  };

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-var(--env-banner-height,0px))] w-full max-w-lg flex-col justify-center px-5 py-12">
      <p className="text-xs font-semibold tracking-[0.16em]" style={{ color: AGENT_GREEN }}>
        AGENT PORTAL
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#0D1836]">
        Set up your authenticator
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#52647C]">
        MFA is required for every agent account and cannot be turned off here. Add CROSSUB to an
        authenticator app, then enter the 6-digit code.
      </p>

      {recoveryCodes ? (
        <section className="mt-8 rounded-[22px] bg-white p-6 shadow-[0_18px_48px_rgba(13,24,54,0.10)]">
          <h2 className="text-lg font-semibold">Save your recovery codes</h2>
          <p className="mt-2 text-sm leading-6 text-[#52647C]">
            Each code works once if you lose the authenticator. This is the only time they are
            shown. A system administrator has to reset MFA if these are lost as well.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((recovery) => (
              <li key={recovery} className="rounded-md bg-[#F6FCFC] px-3 py-2">
                {recovery}
              </li>
            ))}
          </ul>
          <label className="mt-4 flex items-start gap-2 text-sm text-[#52647C]">
            <input
              type="checkbox"
              checked={saved}
              onChange={(event) => setSaved(event.target.checked)}
              className="mt-1 size-4 accent-[#00bd85]"
            />
            I have saved these codes somewhere safe.
          </label>
          <button
            type="button"
            disabled={!saved}
            onClick={finish}
            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[9px] text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: AGENT_GREEN }}
          >
            Continue
          </button>
        </section>
      ) : (
        <section className="mt-8 rounded-[22px] bg-white p-6 shadow-[0_18px_48px_rgba(13,24,54,0.10)]">
          {setup ? (
            <>
              <p className="text-xs font-medium tracking-wide text-[#52647C]">SETUP KEY</p>
              <p className="mt-2 break-all font-mono text-sm text-[#0D1836]">{setup.secret}</p>
              <p className="mt-3 text-xs leading-5 text-[#52647C]">
                In your app choose “enter a setup key”. Account CROSSUB, key above. Time-based,
                6 digits.
              </p>
            </>
          ) : (
            <p className="text-sm text-[#52647C]">Preparing a setup key…</p>
          )}
          <label className="mt-5 block text-sm font-medium" htmlFor="mfa-code">
            Verification code
          </label>
          <input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="mt-1.5 h-12 w-full rounded-[9px] border border-[#CED9E4] px-3 text-sm outline-none focus:border-[#00bd85]"
          />
          <button
            type="button"
            disabled={submitting || code.trim().length < 6 || !setup}
            onClick={() => void confirm()}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[9px] text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: AGENT_GREEN }}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirm and enable MFA
          </button>
        </section>
      )}
    </main>
  );
}
