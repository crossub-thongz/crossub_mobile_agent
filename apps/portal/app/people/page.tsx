'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { PeopleWorkspace } from '@/components/agent/people/people-workspace';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { PEOPLE_AGENCY_PARAM, PEOPLE_COPY } from '@/constants/people';
import { ROUTES } from '@/constants/routes';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';
import { selfManagedAgencies } from '@/lib/portal-service-level';

/** Self-Manage People — any agent of a Self-Manage agency. Everyone else goes back to the dashboard. */
export default function PeoplePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { agencies } = useAgentData();
  const { ready, selfManaged } = useSelfManagedAccess();
  const peopleAgencies = useMemo(() => selfManagedAgencies(agencies), [agencies]);
  const redirect = ready && !selfManaged;

  useEffect(() => {
    if (redirect) router.replace(ROUTES.DASHBOARD);
  }, [redirect, router]);

  if (!ready || redirect) return null;

  return (
    <AgentShell title={PEOPLE_COPY.title} wide hideNeedAction>
      <PeopleWorkspace
        agencies={peopleAgencies}
        initialAgencyId={searchParams.get(PEOPLE_AGENCY_PARAM)}
      />
    </AgentShell>
  );
}
