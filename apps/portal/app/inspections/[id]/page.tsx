'use client';

import { useParams } from 'next/navigation';

import { InspectionDetailView } from '@/components/inspections/inspection-detail-view';
import { InspectionTaskDetailView } from '@/components/inspections/inspection-task-detail-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { ROUTES } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';

export default function InspectionDetailPage() {
  const params = useParams();
  const inspectionId = String(params.id);
  const isV2 = useIsAgentUiV2();
  const back = useBackNavigation(ROUTES.TASKS, 'Tasks');

  return (
    <AgentShell
      title={isV2 ? undefined : 'Inspection job'}
      backHref={back.href}
      backLabel={back.label}
      hideGlobalFabs={isV2}
      wide={isV2}
      hideNeedAction={isV2}
    >
      {isV2 ? (
        <InspectionTaskDetailView inspectionId={inspectionId} />
      ) : (
        <InspectionDetailView inspectionId={inspectionId} />
      )}
    </AgentShell>
  );
}
