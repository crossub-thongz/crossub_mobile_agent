'use client';

import { useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { MaintenanceWorkspace } from '@/components/maintenance-workspace/maintenance-workspace';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES, maintenanceDetail } from '@/constants/routes';
import { AGENT_CASE_INTERACTIONS_ENABLED } from '@/lib/agent-case-mode';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';
import { useMaintenanceCaseLiveSync } from '@/lib/use-maintenance-case-live-sync';

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
  const { maintenanceAll, properties, apiConnected, approveMaintenanceQuote, declineMaintenanceQuote } =
    useAgentData();

  const item = maintenanceAll.find((m) => m.id === id);
  const back = useBackNavigation(ROUTES.MAINTENANCE, 'Maintenance');

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

  if (!item || !workspaceCase) notFound();

  const displayItem = liveMapped ?? item;
  const reminderEta = formatReminderEta(nextReminderDueAt);

  const handleApprove = async () => {
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
      immersive
      backHref={back.href}
      backLabel={back.label}
      hideGlobalFabs
      hideNeedAction
    >
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
    </AgentShell>
  );
}
