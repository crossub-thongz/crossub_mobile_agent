'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { AgentShell } from '@/components/layout/agent-shell';
import { TRUST_PAGE_COPY } from '@/constants/module-workspace';
import { ROUTES } from '@/constants/routes';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

/**
 * Self-Manage trust accounting — principals only. A shell until the agent trust routes land
 * (plan Phase 3); everyone else goes back to the dashboard.
 */
export default function TrustPage() {
  const router = useRouter();
  const { ready, selfManagedPrincipal } = useSelfManagedAccess();
  const redirect = ready && !selfManagedPrincipal;

  useEffect(() => {
    if (redirect) router.replace(ROUTES.DASHBOARD);
  }, [redirect, router]);

  if (!ready || redirect) return null;

  return (
    <AgentShell title={TRUST_PAGE_COPY.title} wide hideNeedAction>
      <div className="lg:px-6 lg:py-6">
        <EmptyState
          icon={Landmark}
          title={TRUST_PAGE_COPY.emptyTitle}
          description={TRUST_PAGE_COPY.emptyDescription}
        />
      </div>
    </AgentShell>
  );
}
