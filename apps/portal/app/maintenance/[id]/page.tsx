'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { MaintenanceTaskDetailView } from '@/components/maintenance-workspace/maintenance-task-detail-view';
import { MaintenanceWorkspace } from '@/components/maintenance-workspace/maintenance-workspace';
import { TaskJobLoading, TaskJobUnavailable } from '@/components/agent/tasks/task-job-status';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { ROUTES, maintenanceDetail } from '@/constants/routes';
import { AGENT_CASE_INTERACTIONS_ENABLED } from '@/lib/agent-case-mode';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';
import { useMaintenanceCaseLiveSync } from '@/lib/use-maintenance-case-live-sync';
import { useResolvedMaintenance } from '@/lib/use-resolved-maintenance';

function formatReminderEta(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'due soon';
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

export default function MaintenanceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const isV2 = useIsAgentUiV2();
  const { properties, apiConnected, approveMaintenanceQuote, declineMaintenanceQuote } =
    useAgentData();
  const { item, resolveState } = useResolvedMaintenance(id);
  const back = useBackNavigation(ROUTES.TASKS, 'Tasks');

  const property = useMemo(
    () => properties.find((p) => p.id === item?.propertyId),
    [properties, item?.propertyId],
  );

  const { workspaceCase, liveMapped, remindersSent, nextReminderDueAt, syncing } =
    useMaintenanceCaseLiveSync(item, property, apiConnected);

  useRecordRecentCaseVisit({
    id: item?.id,
    kind: 'maintenance',
    address: item?.propertyAddress,
    href: item ? maintenanceDetail(item.id) : '',
    module: 'maintenance',
  });

  const displayItem = liveMapped ?? item;
  const reminderEta = formatReminderEta(nextReminderDueAt);

  const handleApprove = async () => {
    if (!item) return;
    if (!apiConnected) {
      toast.error('Connect to the API to approve this quote.');
      return;
    }
    try {
      await approveMaintenanceQuote(item.id);
      toast.success('Quote approved');
    } catch {
      toast.error('Approval failed — check API connection');
    }
  };

  const handleDecline = async (reason: string) => {
    if (!item) return;
    if (!apiConnected) {
      toast.error('Connect to the API to decline this quote.');
      return;
    }
    try {
      await declineMaintenanceQuote(item.id, reason);
      toast.success('Quote declined — requote workflow started');
    } catch {
      toast.error('Decline failed');
    }
  };

  return (
    <AgentShell
      wide
      immersive={!isV2}
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
      ) : isV2 ? (
        <MaintenanceTaskDetailView
          item={displayItem}
          property={property}
          workspaceCase={workspaceCase}
          backHref={back.href}
          backLabel={back.label}
          assignedToName={property?.propertyManager}
          liveSyncing={apiConnected}
          syncing={syncing}
          remindersSent={remindersSent}
          reminderEta={reminderEta}
          onApproveQuote={AGENT_CASE_INTERACTIONS_ENABLED ? handleApprove : undefined}
          onDeclineQuote={AGENT_CASE_INTERACTIONS_ENABLED ? handleDecline : undefined}
          quoteAmount={displayItem.quoteAmount}
          contractorName={displayItem.contractorName}
          quoteExpiry={displayItem.quoteExpiry}
          recommendation={displayItem.recommendation}
          quoteDocumentUrl={displayItem.quoteDocumentUrl}
          requiresApproval={AGENT_CASE_INTERACTIONS_ENABLED && displayItem.requiresApproval}
        />
      ) : (
        <MaintenanceWorkspace
          workspaceCase={workspaceCase}
          backHref={back.href}
          backLabel={back.label}
          assignedToName={property?.propertyManager}
          liveSyncing={apiConnected}
          syncing={syncing}
          remindersSent={remindersSent}
          reminderEta={reminderEta}
          onApproveQuote={AGENT_CASE_INTERACTIONS_ENABLED ? handleApprove : undefined}
          onDeclineQuote={AGENT_CASE_INTERACTIONS_ENABLED ? handleDecline : undefined}
          quoteAmount={displayItem.quoteAmount}
          contractorName={displayItem.contractorName}
          quoteExpiry={displayItem.quoteExpiry}
          recommendation={displayItem.recommendation}
          quoteDocumentUrl={displayItem.quoteDocumentUrl}
          requiresApproval={AGENT_CASE_INTERACTIONS_ENABLED && displayItem.requiresApproval}
        />
      )}
    </AgentShell>
  );
}
