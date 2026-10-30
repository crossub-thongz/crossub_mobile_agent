'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { TrustWorkspace } from '@/components/agent/trust/trust-workspace';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { TRUST_PAGE_COPY } from '@/constants/trust';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';
import { selfManagedTrustAgencies } from '@/lib/portal-service-level';

/**
 * Self-Manage trust accounting (plan Phase 3) — the agency's principal or accountant. Everyone
 * else goes back to the dashboard.
 */
export default function TrustPage() {
  const router = useRouter();
  const { agencies } = useAgentData();
  const { ready, selfManagedTrust } = useSelfManagedAccess();
  const trustAgencies = useMemo(() => selfManagedTrustAgencies(agencies), [agencies]);
  const redirect = ready && !selfManagedTrust;

  useEffect(() => {
    if (redirect) router.replace(ROUTES.DASHBOARD);
  }, [redirect, router]);

  if (!ready || redirect) return null;

  return (
    <AgentShell title={TRUST_PAGE_COPY.title} wide fillMain hideNeedAction>
      <TrustWorkspace agencies={trustAgencies} />
    </AgentShell>
  );
}
