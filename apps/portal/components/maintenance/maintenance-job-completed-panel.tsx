'use client';

import { MaintenanceCompletionGatesPanel } from '@/components/maintenance/maintenance-completion-gates-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import {
  auditEntriesForStep,
  MAINTENANCE_AGENT_STEP,
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { formatDateTime } from '@/lib/utils';

export function MaintenanceJobCompletedPanel({
  ctx,
  attachments = [],
  onCaseUpdated,
}: {
  ctx: MaintenanceWorkflowContext;
  attachments?: ApiMaintenanceAttachment[];
  onCaseUpdated?: () => Promise<void>;
}) {
  const { apiConnected } = useAgentData();

  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.JOB_COMPLETED);
  const landlordFlow = requiresContractorFlow(ctx);

  if (!landlordFlow) {
    return (
      <div className="space-y-4">
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

  return (
    <div className="space-y-4">
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
