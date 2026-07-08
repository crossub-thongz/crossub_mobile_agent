'use client';

import { TerminationDetailView } from '@/components/end-leasing/termination-detail-view';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { VacatingCase } from '@/lib/types';

/** Inline end-leasing workflow on the property Leasing tab. */
export function VacatingWorkflowTimeline({
  vacatingCase,
}: {
  vacatingCase: VacatingCase;
}) {
  const { apiConnected } = useAgentData();

  return (
    <TerminationDetailView
      caseId={vacatingCase.id}
      apiConnected={apiConnected}
      hideHeader
    />
  );
}
