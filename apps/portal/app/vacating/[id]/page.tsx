'use client';

import { notFound, useParams } from 'next/navigation';

import { TerminationDetailView } from '@/components/end-leasing/termination-detail-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { ROUTES, vacatingDetail } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';

export default function VacatingDetailPage() {
  const params = useParams();
  const caseId = String(params.id);
  const isV2 = useIsAgentUiV2();
  const back = useBackNavigation(ROUTES.TASKS, 'Tasks');
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
    <AgentShell
      title="End of lease"
      backHref={back.href}
      backLabel={back.label}
      hideGlobalFabs={isV2}
      wide={isV2}
      hideNeedAction={isV2}
    >
      <TerminationDetailView caseId={caseId} apiConnected={apiConnected} />
    </AgentShell>
  );
}
