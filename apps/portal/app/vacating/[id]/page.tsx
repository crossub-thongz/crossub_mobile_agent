'use client';

import { notFound, useParams } from 'next/navigation';

import { TerminationDetailView } from '@/components/end-leasing/termination-detail-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES, vacatingDetail } from '@/constants/routes';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';

export default function VacatingDetailPage() {
  const params = useParams();
  const caseId = String(params.id);
  const { vacating, apiConnected } = useAgentData();
  const item = vacating.find((v) => v.id === caseId);

  useRecordRecentCaseVisit({
    id: item?.id ?? caseId,
    kind: 'end_leasing',
    address: item?.propertyAddress,
    href: vacatingDetail(caseId),
    module: 'end_leasing',
  });

  if (!item && !apiConnected) notFound();

  return (
    <AgentShell title="End leasing" backHref={ROUTES.VACATING}>
      <TerminationDetailView caseId={caseId} apiConnected={apiConnected} />
    </AgentShell>
  );
}
