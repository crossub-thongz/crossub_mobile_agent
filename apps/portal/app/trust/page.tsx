'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { TrustWorkspace } from '@/components/agent/trust/trust-workspace';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { TRUST_PAGE_COPY } from '@/constants/trust';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';
import { trustAgencies as trustAgenciesOf } from '@/lib/portal-service-level';

/**
 * Trust accounting — the agency's principal or accountant, on a Self-Manage agency (plan Phase 3)
 * or a Full Service one (Accounting PRD, 19 Nov 2026). Everyone else goes back to the dashboard.
 */
export default function TrustPage() {
  const router = useRouter();
  const { agencies } = useAgentData();
  const { ready, agencyTrust } = useSelfManagedAccess();
  const trustAgencies = useMemo(() => trustAgenciesOf(agencies), [agencies]);
  const redirect = ready && !agencyTrust;

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
