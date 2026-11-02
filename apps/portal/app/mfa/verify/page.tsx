'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { BackToSignInButton } from '@/components/auth/back-to-sign-in-button';
import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES } from '@/constants/routes';
import { ApiError, api } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';
import { postAuthDestination } from '@/lib/system-access-agreement';

const AGENT_GREEN = '#00bd85';

export default function MfaVerifyPage() {
  const router = useRouter();
  const { adoptUser } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await api.post<{ user: AuthUser }>('/auth/mfa/verify', { code });
      adoptUser(result.user);
      router.replace(
        postAuthDestination(
          result.user,
          ROUTES.DASHBOARD,
          ROUTES.SYSTEM_ACCESS_AGREEMENT,
          ROUTES.CHANGE_PASSWORD,
        ),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That code is not valid.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-var(--env-banner-height,0px))] w-full max-w-lg flex-col justify-center px-5 py-12">
      <BackToSignInButton />
      <p className="mt-6 text-xs font-semibold tracking-[0.16em]" style={{ color: AGENT_GREEN }}>
        AGENT PORTAL
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#0D1836]">
        Enter your verification code
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#52647C]">
        Accounting users confirm a code on every sign-in. Other agents confirm again once 30 days
        have passed since the last successful code. A recovery code works here too.
      </p>
      <section className="mt-8 rounded-[22px] bg-white p-6 shadow-[0_18px_48px_rgba(13,24,54,0.10)]">
        <label className="block text-sm font-medium" htmlFor="mfa-verify-code">
          Authenticator or recovery code
        </label>
        <input
          id="mfa-verify-code"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="mt-1.5 h-12 w-full rounded-[9px] border border-[#CED9E4] px-3 text-sm outline-none focus:border-[#00bd85]"
        />
        <button
          type="button"
          disabled={submitting || code.trim().length < 6}
          onClick={() => void submit()}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[9px] text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: AGENT_GREEN }}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Continue
        </button>
      </section>
    </main>
  );
}
