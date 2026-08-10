'use client';

import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react';
import Link from 'next/link';
import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { CrossubLogo } from '@/components/brand/crossub-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function LoginPage() {
  const { refresh, status, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <CrossubLogo href="" size="lg" showTagline className="md:items-center" />
        <p className="text-muted-foreground text-sm">Agent portal</p>
      </div>

      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your CROSSUB account credentials
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@agency.com"
                autoComplete="email"
                className="pl-10"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="pl-10 pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <Link href={ROUTES.REGISTER} className="text-primary hover:underline">
              First time? Register
            </Link>
            <Link
              href={ROUTES.FORGOT_PASSWORD}
              className="text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
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
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          First-time login?{' '}
          <Link href={ROUTES.REGISTER} className="text-primary hover:underline">
            Register here
          </Link>
          {' — '}contact the Leasing Team for registration details.
        </p>
      </div>
    </div>
  );
}
