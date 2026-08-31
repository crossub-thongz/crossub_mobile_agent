'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { ACCOUNTING_MODULE_LAUNCHED } from '@/constants/accounting-sections';
import { ROUTES, isPublicRoute } from '@/constants/routes';
import { isFullManagementRoute } from '@/lib/portal-service-level';

function isAccountingRoute(pathname: string): boolean {
  return pathname === ROUTES.ACCOUNTING || pathname.startsWith(`${ROUTES.ACCOUNTING}/`);
}

export function PortalServiceLevelGate({ children }: { children: React.ReactNode }) {
  const { isInspectionOnlyAgent, loading, portalAccessReady } = useAgentData();
  const pathname = usePathname();
  const router = useRouter();

  const blocked =
    !loading &&
    portalAccessReady &&
    ((isInspectionOnlyAgent && isFullManagementRoute(pathname)) ||
      (!ACCOUNTING_MODULE_LAUNCHED && isAccountingRoute(pathname))) &&
    !isPublicRoute(pathname);

  useEffect(() => {
    if (!blocked) return;
    router.replace(ROUTES.DASHBOARD);
  }, [blocked, router]);

  if (loading && !isPublicRoute(pathname)) return null;
  if (blocked) return null;

  return <>{children}</>;
}
