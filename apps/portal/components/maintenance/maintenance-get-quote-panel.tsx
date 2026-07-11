'use client';

import { MaintenanceEmailLog } from '@/components/maintenance/maintenance-email-log';
import {
  auditEntriesForStep,
  buildQuoteSentToAgentEmail,
  MAINTENANCE_AGENT_STEP,
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function MaintenanceGetQuotePanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const quote = ctx.workspaceCase.quotations
    .slice()
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
  const quoteEmail = buildQuoteSentToAgentEmail(ctx);
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
        <section className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-semibold">Handyman quotation</p>
          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Contractor</dt>
              <dd className="font-medium">{ctx.item.contractorName ?? 'Assigned handyman'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total (inc GST)</dt>
              <dd className="font-semibold tabular-nums">{formatCurrency(quote.price)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">{quote.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd className="font-medium">{formatDateTime(quote.submittedAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Quote description</dt>
              <dd className="mt-1 leading-relaxed whitespace-pre-wrap">{quote.scope}</dd>
            </div>
            {quote.declineReason ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Decline reason</dt>
                <dd className="mt-1 text-destructive">{quote.declineReason}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          Awaiting handyman quote
          {ctx.item.contractorName ? ` from ${ctx.item.contractorName}` : ''}.
          The quotation should include labour, call-out, and parts breakdown with GST noted.
        </p>
      )}

      {quoteEmail ? <MaintenanceEmailLog title="Quotation report to agent" emails={[quoteEmail]} /> : null}

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
