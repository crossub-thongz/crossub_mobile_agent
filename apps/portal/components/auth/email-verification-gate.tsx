'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES, isPublicRoute } from '@/constants/routes';
import {
  EMAIL_VERIFICATION_BLOCK_MESSAGE,
  isEmailVerificationBlockedRoute,
  isEmailVerificationGateExempt,
  needsEmailVerification,
} from '@/lib/email-verification';

export function EmailVerificationGate({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const unverified = status === 'authed' && needsEmailVerification(user);
  const onBlockedRoute =
    unverified &&
    !isPublicRoute(pathname) &&
    !isEmailVerificationGateExempt(pathname) &&
    isEmailVerificationBlockedRoute(pathname);

  useEffect(() => {
    if (!onBlockedRoute) return;
    toast.error(EMAIL_VERIFICATION_BLOCK_MESSAGE);
    router.replace(ROUTES.DASHBOARD);
  }, [onBlockedRoute, router]);

  if (status === 'loading' && !isPublicRoute(pathname)) return null;
  if (onBlockedRoute) return null;

  return <>{children}</>;
}
