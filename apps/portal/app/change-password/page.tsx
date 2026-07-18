'use client';

import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';
import { ApiError, api } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';
import {
  needsPasswordChange,
  needsSystemAccessAgreement,
} from '@/lib/system-access-agreement';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Min ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status, refresh } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const forced = Boolean(user && needsPasswordChange(user));
  const fromSettings = searchParams.get('from') === 'settings';

  useEffect(() => {
    if (status === 'guest') {
      router.replace(ROUTES.LOGIN);
      return;
    }
    if (status !== 'authed' || !user) return;
    if (needsSystemAccessAgreement(user)) {
      router.replace(ROUTES.SYSTEM_ACCESS_AGREEMENT);
    }
  }, [status, user, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Keep the access cookie fresh before the authenticated change-password call.
      try {
        await api.post('/auth/refresh');
      } catch {
        /* request layer will refresh again on 401 if needed */
      }

      await api.post<{ user: AuthUser }>('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      await api.post('/auth/refresh');
      await refresh();
      toast.success(forced ? 'Password updated. Welcome to the Agent portal.' : 'Password updated');
      reset();
      if (forced) {
        router.replace(ROUTES.DASHBOARD);
      } else if (fromSettings) {
        router.replace(ROUTES.SETTINGS);
      } else {
        router.replace(ROUTES.SETTINGS);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Unable to change password.');
        return;
      }
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (status === 'loading' || status === 'guest' || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // If somehow still needing agreement, don't flash the form.
  if (needsSystemAccessAgreement(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border/70 bg-card/80 p-6 shadow-xl backdrop-blur sm:p-8">
        {!forced ? (
          <Link
            href={ROUTES.SETTINGS}
            className="text-muted-foreground mb-4 inline-flex items-center gap-1 text-sm hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to settings
          </Link>
        ) : null}

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {forced ? 'Required before access' : 'Account security'}
            </p>
            <h1 className="text-xl font-semibold text-foreground">Change password</h1>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {forced
            ? 'Your account was set up with a temporary password. Choose a new password to continue.'
            : 'Enter your current password, then choose a new one.'}
        </p>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Existing password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-10"
                {...register('currentPassword')}
              />
              <button
                type="button"
                className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.currentPassword ? (
              <p className="text-destructive text-xs">{errors.currentPassword.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-10"
                {...register('newPassword')}
              />
              <button
                type="button"
                className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-muted-foreground text-[11px]">
              At least {PASSWORD_MIN} characters.
            </p>
            {errors.newPassword ? (
              <p className="text-destructive text-xs">{errors.newPassword.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-10"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {forced ? 'Save and continue' : 'Update password'}
          </Button>
        </form>

        {!forced ? (
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Forgot your current password?{' '}
            <Link href={ROUTES.FORGOT_PASSWORD} className="text-primary underline-offset-2 hover:underline">
              Reset via email
            </Link>
          </p>
        ) : null}
      </Card>
    </div>
  );
}
