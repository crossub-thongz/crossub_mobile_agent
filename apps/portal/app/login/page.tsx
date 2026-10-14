'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  ChartColumn,
  ChevronDown,
  Eye,
  EyeOff,
  House,
  Loader2,
  Lock,
  Mail,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAuth } from '@/components/providers/auth-provider';
import { PASSWORD_MAX } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';
import { ApiError, api } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';
import { loginLocalAccount } from '@/lib/local-auth';
import { postAuthDestination } from '@/lib/system-access-agreement';

/**
 * ⚠️ `password` deliberately carries NO `.min(PASSWORD_MIN)`. Signing in VERIFIES a password;
 * it does not SET one. The length policy belongs on the screens that set a password —
 * `/register`, `/reset-password/[token]`, `/change-password` — and all three still enforce it.
 * A minimum here cannot admit an account the API would reject; it can only lock out an account
 * whose password predates the policy, and it does so in the BROWSER, so the request never even
 * reaches the API and nothing is logged server-side.
 *
 * That is not hypothetical. The agent logins migrated on 6 Aug 2026 carry the agents' own
 * legacy passwords and 23 of the 43 are 6–9 characters. `LoginDto` was fixed on 10 Aug
 * (crossub_web `c4c3e077`) after the same rule locked them out API-side — but this copy kept
 * them out for another day, and it looked different from the agent's side: the form greys out
 * with "Min 10 characters" under a password that is perfectly correct. Two agencies read that
 * as "my password is wrong", changed it, and still could not get in.
 *
 * `.max(PASSWORD_MAX)` stays: it bounds what is handed to Argon2 and is a cost guard, not a
 * policy statement. Do not "restore" the minimum here for symmetry with the other three forms.
 */
const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX),
});

type FormValues = z.infer<typeof schema>;

const AGENT_GREEN = '#14B88D';

export default function LoginPage() {
  const { refresh, status, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [languageOpen, setLanguageOpen] = useState(false);

  useLayoutEffect(() => {
    if (status !== 'authed' || !user) return;
    window.location.replace(
      postAuthDestination(
        user,
        ROUTES.DASHBOARD,
        ROUTES.SYSTEM_ACCESS_AGREEMENT,
        ROUTES.CHANGE_PASSWORD,
      ),
    );
  }, [status, user]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    let apiUnreachable = false;

    try {
      const result = await api.post<{ user: AuthUser }>('/auth/login', values);
      const authStatus = await refresh();
      if (authStatus !== 'authed') {
        toast.error(
          'Sign-in succeeded but the session cookie was not saved. Clear site cookies for localhost and try again.',
        );
        return;
      }
      window.location.assign(
        postAuthDestination(
          result.user,
          ROUTES.DASHBOARD,
          ROUTES.SYSTEM_ACCESS_AGREEMENT,
          ROUTES.CHANGE_PASSWORD,
        ),
      );
      return;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          /* fall through to local account */
        } else if (err.status >= 500 || err.status === 0) {
          apiUnreachable = true;
        } else {
          toast.error(`Sign in failed (${err.status}). Check API connection.`);
          return;
        }
      } else {
        apiUnreachable = true;
      }
    }

    const localUser = loginLocalAccount(values.email, values.password);
    if (localUser) {
      await refresh();
      window.location.assign(ROUTES.DASHBOARD);
      return;
    }

    if (apiUnreachable) {
      toast.error(
        'Cannot reach the CROSSUB API. Start crossub_web on port 3001 (pnpm dev:api), or use Register for a local-only account.',
      );
      return;
    }

    toast.error('Invalid email or password.');
  };

  return (
    <div
      className="relative min-h-dvh text-[#0D1836]"
      style={{
        backgroundColor: '#F6FCFC',
        backgroundImage: 'url(/login/agent-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-2.5">
          <Image src="/crossub-logo.png" alt="" width={36} height={36} priority className="size-9" />
          <span className="text-[15px] font-bold tracking-[0.16em]">CROSSUB</span>
        </div>
        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-[#52647C]"
            aria-expanded={languageOpen}
            aria-haspopup="listbox"
            onClick={() => setLanguageOpen((open) => !open)}
          >
            English
            <ChevronDown className="size-4" />
          </button>
          {languageOpen ? (
            <ul
              role="listbox"
              className="absolute right-0 z-10 mt-2 min-w-32 rounded-xl border border-[#CED9E4] bg-white p-1 text-sm shadow-lg"
            >
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected
                  className="w-full rounded-lg px-3 py-2 text-left font-medium"
                  style={{ color: AGENT_GREEN }}
                  onClick={() => setLanguageOpen(false)}
                >
                  English
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-12 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_440px] lg:gap-16 lg:px-10 lg:pb-16">
        <section className="max-w-xl">
          <p
            className="text-xs font-semibold tracking-[0.16em]"
            style={{ color: AGENT_GREEN }}
          >
            AGENT PORTAL
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#0D1836] sm:text-5xl sm:leading-[1.05]">
            Smarter property management, together.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[#52647C]">
            Access your properties, inspections, maintenance and more — all in one place.
          </p>
          <ul className="mt-8 space-y-5">
            <Feature
              icon={House}
              title="Manage your portfolio"
              body="Leasing, inspections, maintenance"
            />
            <Feature
              icon={ChartColumn}
              title="Real-time updates"
              body="Stay on top of what matters"
            />
            <Feature
              icon={Users}
              title="Work with our team"
              body="Faster communication, better outcomes"
            />
          </ul>
        </section>

        <section className="w-full justify-self-end rounded-[22px] bg-white p-6 shadow-[0_18px_48px_rgba(13,24,54,0.10)] sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-[#52647C]">Sign in to your Crossub Agent Portal</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8AA0B5]" />
                <input
                  id="email"
                  type="email"
                  placeholder="info@apamgmt.com.au"
                  autoComplete="email"
                  className="h-12 w-full rounded-[9px] border border-[#CED9E4] bg-white pr-3 pl-10 text-sm outline-none placeholder:text-[#9AADC0] focus:border-[#14B88D]"
                  {...register('email')}
                />
              </div>
              {errors.email ? (
                <p className="text-xs text-[#D45656]">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8AA0B5]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-[9px] border border-[#CED9E4] bg-white pr-10 pl-10 text-sm outline-none placeholder:text-[#9AADC0] focus:border-[#14B88D]"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#8AA0B5]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-[#D45656]">{errors.password.message}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="inline-flex items-center gap-2 text-[#52647C]">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(event) => setKeepSignedIn(event.target.checked)}
                  className="size-4 rounded border-[#CED9E4] accent-[#14B88D]"
                />
                Keep me signed in
              </label>
              <Link href={ROUTES.FORGOT_PASSWORD} className="font-medium" style={{ color: AGENT_GREEN }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[9px] text-sm font-semibold text-white disabled:opacity-70"
              style={{ backgroundColor: AGENT_GREEN }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#52647C]">
            First time here?{' '}
            <Link href={ROUTES.REGISTER} className="font-semibold" style={{ color: AGENT_GREEN }}>
              Register your agency
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof House;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E2FAF1] text-[#14B88D]">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-[#52647C]">{body}</span>
      </span>
    </li>
  );
}
