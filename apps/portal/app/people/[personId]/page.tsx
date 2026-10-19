'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { PersonProfile } from '@/components/agent/people/person-profile';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { PEOPLE_AGENCY_PARAM, PEOPLE_COPY, PERSON_PROFILE_COPY } from '@/constants/people';
import { ROUTES, peopleList } from '@/constants/routes';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';
import { selfManagedAgencies } from '@/lib/portal-service-level';

/**
 * One person on a Self-Manage agency. The agency comes from the link; with no agency on the
 * link and exactly one Self-Manage agency, that one. Anything else shows "not found".
 */
export default function PersonPage() {
  const router = useRouter();
  const params = useParams<{ personId: string }>();
  const searchParams = useSearchParams();
  const { agencies } = useAgentData();
  const { ready, selfManaged } = useSelfManagedAccess();
  const requestedAgencyId = searchParams.get(PEOPLE_AGENCY_PARAM);
  const agencyId = useMemo(() => {
    const own = selfManagedAgencies(agencies);
    if (requestedAgencyId) return own.some((a) => a.id === requestedAgencyId) ? requestedAgencyId : null;
    return own.length === 1 ? own[0].id : null;
  }, [agencies, requestedAgencyId]);
  const redirect = ready && !selfManaged;

  useEffect(() => {
    if (redirect) router.replace(ROUTES.DASHBOARD);
  }, [redirect, router]);

  if (!ready || redirect) return null;

  return (
    <AgentShell
      title={PEOPLE_COPY.title}
      backHref={peopleList(agencyId ?? undefined)}
      backLabel={PERSON_PROFILE_COPY.backLabel}
      wide
      hideNeedAction
    >
      <PersonProfile agencyId={agencyId} personId={params.personId} />
    </AgentShell>
  );
}
