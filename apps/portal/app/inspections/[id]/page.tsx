'use client';

import { useParams } from 'next/navigation';

import { InspectionDetailView } from '@/components/inspections/inspection-detail-view';
import { InspectionTaskDetailView } from '@/components/inspections/inspection-task-detail-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { ROUTES } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

export default function InspectionDetailPage() {
  const params = useParams();
  const inspectionId = String(params.id);
  const isV2 = useIsAgentUiV2();
  const { selfManaged } = useSelfManagedAccess();
  const back = useBackNavigation(
    selfManaged ? ROUTES.INSPECTIONS : ROUTES.TASKS,
    selfManaged ? 'Inspections' : 'Tasks',
  );

  return (
    <AgentShell
      title={isV2 || selfManaged ? undefined : 'Inspection job'}
      backHref={back.href}
      backLabel={back.label}
      hideGlobalFabs={isV2 || selfManaged}
      wide={isV2 || selfManaged}
      hideNeedAction={isV2 || selfManaged}
    >
      {isV2 || selfManaged ? (
        <InspectionTaskDetailView inspectionId={inspectionId} />
      ) : (
        <InspectionDetailView inspectionId={inspectionId} />
      )}
    </AgentShell>
  );
}
