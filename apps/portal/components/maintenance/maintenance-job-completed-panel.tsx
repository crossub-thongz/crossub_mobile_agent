'use client';

import { MaintenanceCompletedCaseArchive } from '@/components/maintenance/maintenance-completed-case-archive';
import { MaintenanceCompletionGatesPanel } from '@/components/maintenance/maintenance-completion-gates-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import {
  auditEntriesForStep,
  getMaintenanceQuotationsForCase,
  MAINTENANCE_AGENT_STEP,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { formatDateTime } from '@/lib/utils';

export function MaintenanceJobCompletedPanel({
  ctx,
  attachments = [],
  contractors = [],
  onCaseUpdated,
}: {
  ctx: MaintenanceWorkflowContext;
  attachments?: ApiMaintenanceAttachment[];
  contractors?: Array<{ id: string; name: string }>;
  onCaseUpdated?: () => Promise<void>;
}) {
  const { apiConnected } = useAgentData();

  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.JOB_COMPLETED);
  const quotations = getMaintenanceQuotationsForCase(ctx.workspaceCase);
  const status = ctx.workspaceCase.status;
  const showArchive = status === 'completed' || status === 'closed';

  return (
    <div className="space-y-4">
      {showArchive ? (
        <MaintenanceCompletedCaseArchive
          requestId={ctx.item.id}
          quotations={quotations}
          contractors={contractors}
          invitedContractors={ctx.item.invitedContractors}
          assignedContractorId={ctx.workspaceCase.assignedContractorId}
          assignedContractorName={ctx.item.contractorName}
          quotationReviews={ctx.workspaceCase.quotationReviews}
        />
      ) : null}

      <MaintenanceCompletionGatesPanel
        ctx={ctx}
        attachments={attachments}
        apiConnected={apiConnected}
        onUpdated={onCaseUpdated}
      />

      {audit.length > 0 ? (
        <div className="rounded-xl border bg-card p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Completion events
          </p>
          <ol className="space-y-2">
            {audit.map((entry) => (
              <li key={entry.id} className="text-xs">
                <p className="font-medium">{entry.message}</p>
                <p className="text-muted-foreground mt-0.5">
                  {formatDateTime(entry.timestamp)} · {entry.actor}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
