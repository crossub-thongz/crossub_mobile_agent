'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';
import { ApiError, api } from '@/lib/api';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Min ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const token = params.token?.trim() ?? '';
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast.error('This reset link is invalid.');
      return;
    }

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: values.newPassword,
      });
      toast.success('Password reset. Please sign in.');
      router.replace(ROUTES.LOGIN);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error('This reset link is invalid or has expired.');
        return;
      }
      toast.error('Unable to reset password. Please try again.');
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
          <h1 className="text-xl font-semibold">Invalid reset link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Request a new password reset email to continue.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href={ROUTES.FORGOT_PASSWORD}>Request reset link</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
        <Link
          href={ROUTES.LOGIN}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        <div className="mb-6 space-y-1">
          <h1 className="text-xl font-semibold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">
            Enter a new password for your Agent Portal account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                className="pl-10 pr-10"
                placeholder="Enter your New Password"
                {...register('newPassword')}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              At least {PASSWORD_MIN} characters.
            </p>
            {errors.newPassword ? (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className="pl-10 pr-10"
                placeholder="Confirm your New Password"
                {...register('confirmPassword')}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Link expired?{' '}
          <Link href={ROUTES.FORGOT_PASSWORD} className="text-primary underline-offset-2 hover:underline">
            Request another
          </Link>
        </p>
      </div>
    </div>
  );
}
