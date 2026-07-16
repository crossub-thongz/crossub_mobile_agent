'use client';

import { MaintenanceCompletionGatesPanel } from '@/components/maintenance/maintenance-completion-gates-panel';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import {
  auditEntriesForStep,
  MAINTENANCE_AGENT_STEP,
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function MaintenanceInProgressPanel({
  ctx,
  attachments = [],
  onCaseUpdated,
  apiConnected = true,
}: {
  ctx: MaintenanceWorkflowContext;
  attachments?: ApiMaintenanceAttachment[];
  onCaseUpdated?: () => Promise<void>;
  apiConnected?: boolean;
}) {
  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.IN_PROGRESS);
  const landlordFlow = requiresContractorFlow(ctx);
  const showCompletionGates =
    ['in_progress', 'completed', 'closed'].includes(ctx.workspaceCase.status);

  if (!landlordFlow) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground rounded-xl border bg-card p-4 text-sm">
          {ctx.workspaceCase.responsibility === 'tenant'
            ? 'Tenant is responsible for arranging and completing this repair.'
            : 'Strata is responsible for this repair.'}
        </p>

        {showCompletionGates ? (
          <MaintenanceCompletionGatesPanel
            ctx={ctx}
            attachments={attachments}
            apiConnected={apiConnected}
            onUpdated={onCaseUpdated}
          />
        ) : null}

        {audit.length > 0 ? (
          <div className="rounded-xl border bg-card p-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Progress events
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
      {['in_progress', 'completed', 'closed'].includes(ctx.workspaceCase.status) ? (
        <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 text-xs">
          <div>
            <dt className="text-muted-foreground">Contractor</dt>
            <dd className="font-medium">{ctx.item.contractorName ?? '—'}</dd>
          </div>
          {ctx.item.quoteAmount != null ? (
            <div>
              <dt className="text-muted-foreground">Approved quote</dt>
              <dd className="font-medium tabular-nums">{formatCurrency(ctx.item.quoteAmount)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">On-site status</dt>
            <dd className="font-medium">
              {ctx.workspaceCase.status === 'in_progress' ? 'Repair in progress' : 'Work complete'}
            </dd>
          </div>
        </dl>
      ) : null}

      {showCompletionGates ? (
        <MaintenanceCompletionGatesPanel
          ctx={ctx}
          attachments={attachments}
          apiConnected={apiConnected}
          onUpdated={onCaseUpdated}
        />
      ) : null}

      {audit.length > 0 ? (
        <div className="rounded-xl border bg-card p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Progress events
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
