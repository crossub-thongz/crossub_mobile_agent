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
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { PASSWORD_MAX, PASSWORD_MIN } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';
import { ApiError, api } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';
import { loginLocalAccount } from '@/lib/local-auth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(PASSWORD_MIN, `Min ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { refresh, status } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === 'authed') {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [status, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post<{ user: AuthUser }>('/auth/login', values);
      await refresh();
      router.replace(ROUTES.DASHBOARD);
      return;
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401 && err.status >= 400) {
        if (err.status >= 500 || err.status === 0) {
          /* fall through to local account */
        } else if (err.status !== 401) {
          toast.error(`Sign in failed (${err.status}). Check API connection.`);
          return;
        }
      }
    }

    const localUser = loginLocalAccount(values.email, values.password);
    if (localUser) {
      await refresh();
      router.replace(ROUTES.DASHBOARD);
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
        <CrossubLogo href="" size="lg" showTagline />
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
