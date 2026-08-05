'use client';

import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { CrossubLogo } from '@/components/brand/crossub-logo';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/components/providers/auth-provider';
import { ApiError, api } from '@/lib/api';

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>();
  const token = params.token?.trim() ?? '';
  const router = useRouter();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>(
    token ? 'loading' : 'invalid',
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void (async () => {
      try {
        await api.post('/auth/verify-email', { token });
        if (cancelled) return;
        await refresh();
        if (cancelled) return;
        setStatus('success');
        toast.success('Email verified — you’re all set.');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        if (err instanceof ApiError && err.status === 401) {
          toast.error('This verification link is invalid or has expired.');
        } else {
          toast.error('Unable to verify your email. Please try again.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh, token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="mb-8 flex flex-col items-center gap-2">
        <CrossubLogo size="lg" showTagline />
      </div>

      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
        {status === 'loading' ? (
          <>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Loader2 className="size-5 animate-spin text-primary" />
              Verifying your email…
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Hang on while we confirm your account.
            </p>
          </>
        ) : null}

        {status === 'success' ? (
          <>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Email verified
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Your email address is confirmed. You can continue using the agent portal.
            </p>
            <Button className="mt-6 w-full" onClick={() => router.replace(ROUTES.DASHBOARD)}>
              Go to dashboard
            </Button>
          </>
        ) : null}

        {status === 'error' || status === 'invalid' ? (
          <>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Mail className="size-5 text-muted-foreground" />
              Verification link problem
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {status === 'invalid'
                ? 'This verification link is missing or malformed.'
                : 'The link may have expired. Sign in and request a new verification email from your profile, or register again.'}
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href={ROUTES.LOGIN}>Sign in</Link>
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
