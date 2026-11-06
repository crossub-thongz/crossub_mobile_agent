'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LoggingInScreen } from '@/components/auth/logging-in-screen';
import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES, isPublicRoute } from '@/constants/routes';
import {
  needsMfaChallenge,
  needsMfaEnrollment,
  needsPasswordChange,
  needsSystemAccessAgreement,
  postAuthDestination,
} from '@/lib/system-access-agreement';

const MFA_EXEMPT = [ROUTES.MFA_SETUP, ROUTES.MFA_VERIFY, ROUTES.CHANGE_PASSWORD, ROUTES.SYSTEM_ACCESS_AGREEMENT];

export function MfaGate({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const onExemptPage = MFA_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const earlierGate =
    !!user && (needsSystemAccessAgreement(user) || needsPasswordChange(user));
  const enrollmentDue =
    status === 'authed' && !!user && needsMfaEnrollment(user) && !earlierGate && !onExemptPage;
  const challengeDue =
    status === 'authed' &&
    !!user &&
    needsMfaChallenge(user) &&
    !needsMfaEnrollment(user) &&
    !earlierGate &&
    !onExemptPage;

  useEffect(() => {
    if (isPublicRoute(pathname)) return;
    if (enrollmentDue) router.replace(ROUTES.MFA_SETUP);
    else if (challengeDue) router.replace(ROUTES.MFA_VERIFY);
    else if (
      status === 'authed' &&
      user &&
      !needsMfaEnrollment(user) &&
      !needsMfaChallenge(user) &&
      (pathname === ROUTES.MFA_SETUP || pathname === ROUTES.MFA_VERIFY)
    ) {
      router.replace(
        postAuthDestination(
          user,
          ROUTES.DASHBOARD,
          ROUTES.SYSTEM_ACCESS_AGREEMENT,
          ROUTES.CHANGE_PASSWORD,
        ),
      );
    }
  }, [challengeDue, enrollmentDue, pathname, router, status, user]);

  if (status === 'loading' && !isPublicRoute(pathname)) return <LoggingInScreen />;
  if ((enrollmentDue || challengeDue) && !isPublicRoute(pathname)) return <LoggingInScreen />;

  return <>{children}</>;
}
