'use client';

import { useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';

import { MaintenanceTaskDetailView } from '@/components/maintenance-workspace/maintenance-task-detail-view';
import { TaskJobLoading, TaskJobUnavailable } from '@/components/agent/tasks/task-job-status';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES, maintenanceDetail } from '@/constants/routes';
import { AGENT_CASE_INTERACTIONS_ENABLED } from '@/lib/agent-case-mode';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';
import { useMaintenanceCaseLiveSync } from '@/lib/use-maintenance-case-live-sync';
import { useResolvedMaintenance } from '@/lib/use-resolved-maintenance';

export default function MaintenanceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { properties, apiConnected, refresh } = useAgentData();
  const { item, resolveState } = useResolvedMaintenance(id);
  const { selfManaged } = useSelfManagedAccess();
  const back = useBackNavigation(
    selfManaged ? ROUTES.MAINTENANCE : ROUTES.TASKS,
    selfManaged ? 'Maintenance' : 'Tasks',
  );

  const property = useMemo(
    () => properties.find((p) => p.id === item?.propertyId),
    [properties, item?.propertyId],
  );

  const {
    workspaceCase,
    liveMapped,
    syncing,
    attachments,
    refresh: refreshCase,
    contractors,
    quotations,
    workflowRequest,
    maintenanceReminders,
  } = useMaintenanceCaseLiveSync(item, property, apiConnected);

  useRecordRecentCaseVisit({
    id: item?.id,
    kind: 'maintenance',
    address: item?.propertyAddress,
    href: item ? maintenanceDetail(item.id) : '',
    module: 'maintenance',
  });

  const displayItem = liveMapped ?? item;

  const handleCaseUpdated = useCallback(async () => {
    await refreshCase();
    await refresh();
  }, [refresh, refreshCase]);

  return (
    <AgentShell
      wide
      backHref={back.href}
      backLabel={back.label}
      hideGlobalFabs
      hideNeedAction
    >
      {resolveState === 'pending' || (item && !workspaceCase) ? (
        <TaskJobLoading label="Loading maintenance…" />
      ) : !item || !workspaceCase || !displayItem ? (
        <TaskJobUnavailable
          title="Maintenance job not found"
          description="This job may still be saving. Open it from Tasks in a moment."
        />
      ) : (
        <MaintenanceTaskDetailView
          item={displayItem}
          property={property}
          workspaceCase={workspaceCase}
          assignedToName={property?.propertyManager}
          syncing={syncing}
          quoteAmount={displayItem.quoteAmount}
          contractorName={displayItem.contractorName}
          quoteExpiry={displayItem.quoteExpiry}
          recommendation={displayItem.recommendation}
          attachments={attachments}
          apiConnected={apiConnected}
          onCaseUpdated={AGENT_CASE_INTERACTIONS_ENABLED ? handleCaseUpdated : undefined}
          contractors={contractors}
          quotations={quotations}
          workflowRequest={workflowRequest}
          maintenanceReminders={maintenanceReminders}
        />
      )}
    </AgentShell>
  );
}
