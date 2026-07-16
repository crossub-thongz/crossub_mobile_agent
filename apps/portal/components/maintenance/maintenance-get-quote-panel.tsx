'use client';

import { MaintenanceRepairQuotationPanel } from '@/components/maintenance/maintenance-repair-quotation-panel';
import {
  auditEntriesForStep,
  getLatestMaintenanceQuotation,
  MAINTENANCE_AGENT_STEP,
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { formatDateTime } from '@/lib/utils';

export function MaintenanceGetQuotePanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const quote = getLatestMaintenanceQuotation(ctx.workspaceCase);
  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.GET_QUOTE);
  const landlordFlow = requiresContractorFlow(ctx);

  if (!landlordFlow) {
    return (
      <p className="text-muted-foreground rounded-xl border bg-card p-4 text-sm">
        Contractor quotation is not required —{' '}
        <span className="text-foreground font-medium">{ctx.workspaceCase.responsibility}</span>{' '}
        is responsible for this repair.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {quote ? (
        <MaintenanceRepairQuotationPanel
          quote={quote}
          contractorName={ctx.item.contractorName}
          mode="readonly"
        />
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          Awaiting handyman quote
          {ctx.item.contractorName ? ` from ${ctx.item.contractorName}` : ''}.
          The quotation should include labour, call-out, and parts breakdown with GST noted.
        </p>
      )}

      {audit.length > 0 ? (
        <div className="rounded-xl border bg-card p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Quote events
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
