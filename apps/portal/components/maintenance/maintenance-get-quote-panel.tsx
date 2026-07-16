'use client';

import { MaintenanceRepairQuotationPanel } from '@/components/maintenance/maintenance-repair-quotation-panel';
import {
  auditEntriesForStep,
  getMaintenanceQuotationsForCase,
  MAINTENANCE_AGENT_STEP,
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import {
  resolveInvitedContractorIds,
  resolveMaintenanceResponsibility,
} from '@/lib/maintenance/infer-responsibility';
import { formatDateTime } from '@/lib/utils';

function contractorLabel(
  contractorId: string,
  ctx: MaintenanceWorkflowContext,
): string | undefined {
  if (ctx.item.contractorName && ctx.workspaceCase.assignedContractorId === contractorId) {
    return ctx.item.contractorName;
  }
  return contractorId;
}

export function MaintenanceGetQuotePanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const quotes = getMaintenanceQuotationsForCase(ctx.workspaceCase);
  const submittedQuotes = quotes.filter((quote) => quote.status === 'submitted');
  const invitedIds = resolveInvitedContractorIds(ctx);
  const awaitingIds = invitedIds.filter(
    (id) => !submittedQuotes.some((quote) => quote.contractorId === id),
  );
  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.GET_QUOTE);
  const landlordFlow = requiresContractorFlow(ctx);

  if (!landlordFlow) {
    const responsibility = resolveMaintenanceResponsibility(ctx);
    return (
      <p className="text-muted-foreground rounded-xl border bg-card p-4 text-sm">
        Contractor quotation is not required —{' '}
        <span className="text-foreground font-medium capitalize">
          {responsibility ?? 'this party'}
        </span>{' '}
        is responsible for this repair.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {awaitingIds.length > 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-4">
          <p className="text-sm font-semibold">Awaiting handyman quote</p>
          <p className="text-muted-foreground mt-1 text-xs">
            RFQ sent to {awaitingIds.length} contractor
            {awaitingIds.length === 1 ? '' : 's'} — waiting for repair quotations to be returned.
          </p>
          <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
            {awaitingIds.map((id) => (
              <li key={id}>• {contractorLabel(id, ctx) ?? id}</li>
            ))}
          </ul>
        </div>
      ) : submittedQuotes.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          Awaiting handyman quote
          {ctx.item.contractorName ? ` from ${ctx.item.contractorName}` : ''}.
          The quotation should include labour, call-out, and parts breakdown with GST noted.
        </p>
      ) : null}

      {submittedQuotes.map((quote) => (
        <MaintenanceRepairQuotationPanel
          key={quote.id}
          quote={quote}
          contractorName={contractorLabel(quote.contractorId, ctx)}
          mode="readonly"
        />
      ))}

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
