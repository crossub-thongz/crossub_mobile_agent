'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES, isPublicRoute } from '@/constants/routes';
import {
  needsPasswordChange,
  needsSystemAccessAgreement,
} from '@/lib/system-access-agreement';

const PASSWORD_EXEMPT = [ROUTES.CHANGE_PASSWORD, ROUTES.SYSTEM_ACCESS_AGREEMENT];

export function MustChangePasswordGate({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const onExemptPage = PASSWORD_EXEMPT.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Agreement comes first — don't interrupt that flow.
  const awaitingAgreement =
    !!user && needsSystemAccessAgreement(user);

  const mustChange =
    status === 'authed' &&
    !!user &&
    needsPasswordChange(user) &&
    !awaitingAgreement &&
    !onExemptPage;

  useEffect(() => {
    if (!mustChange || isPublicRoute(pathname)) return;
    router.replace(ROUTES.CHANGE_PASSWORD);
  }, [mustChange, pathname, router]);

  if (status === 'loading') return null;
  if (mustChange && !isPublicRoute(pathname)) return null;

  return <>{children}</>;
}
