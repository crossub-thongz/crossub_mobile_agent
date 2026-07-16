'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { MaintenanceCompletionGatesPanel } from '@/components/maintenance/maintenance-completion-gates-panel';
import { Button } from '@/components/ui/button';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import { markMaintenanceWorkComplete } from '@/lib/maintenance/maintenance-case-ops';
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
  const [busy, setBusy] = useState(false);

  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.IN_PROGRESS);
  const landlordFlow = requiresContractorFlow(ctx);
  const landlordWorkInProgress =
    landlordFlow &&
    ctx.workspaceCase.status === 'in_progress' &&
    !ctx.workspaceCase.completionEvidenceUploaded;
  const showDirectPartyGates =
    !landlordFlow &&
    ['in_progress', 'completed', 'closed'].includes(ctx.workspaceCase.status);

  const handleMarkWorkComplete = async () => {
    if (!apiConnected) {
      toast.error('Connect to the API to update this job.');
      return;
    }
    setBusy(true);
    try {
      await markMaintenanceWorkComplete(ctx.item.id);
      toast.success('Work marked complete — confirm payment in the Done step');
      await onCaseUpdated?.();
    } catch {
      toast.error('Could not mark work complete');
    } finally {
      setBusy(false);
    }
  };

  if (!landlordFlow) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground rounded-xl border bg-card p-4 text-sm">
          {ctx.workspaceCase.responsibility === 'tenant'
            ? 'Tenant is responsible for arranging and completing this repair.'
            : 'Strata is responsible for this repair.'}
        </p>

        {showDirectPartyGates ? (
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
          <div>
            <dt className="text-muted-foreground">Completion evidence</dt>
            <dd className="font-medium">
              {ctx.workspaceCase.completionEvidenceUploaded ? 'Uploaded' : 'Pending'}
            </dd>
          </div>
        </dl>
      ) : null}

      {landlordWorkInProgress ? (
        <Button
          type="button"
          className="w-full"
          variant="outline"
          disabled={busy}
          onClick={() => void handleMarkWorkComplete()}
        >
          Mark work complete
        </Button>
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
