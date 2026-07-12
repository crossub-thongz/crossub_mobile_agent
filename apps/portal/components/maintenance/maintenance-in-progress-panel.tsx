'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  auditEntriesForStep,
  MAINTENANCE_AGENT_STEP,
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function MaintenanceInProgressPanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const { maintenanceFromApi, approveMaintenanceQuote, declineMaintenanceQuote, refresh } =
    useAgentData();
  const apiItem = maintenanceFromApi.find((m) => m.id === ctx.item.id);
  const [declineReason, setDeclineReason] = useState('');
  const [busy, setBusy] = useState(false);

  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.IN_PROGRESS);
  const landlordFlow = requiresContractorFlow(ctx);
  const awaitingApproval = ctx.item.requiresApproval && ctx.workspaceCase.status === 'pending_approval';

  const handleApprove = async () => {
    if (!apiItem?.submittedQuotationId) {
      toast.error('Connect to the API to approve this quote.');
      return;
    }
    setBusy(true);
    try {
      await approveMaintenanceQuote(apiItem.submittedQuotationId);
      toast.success('Quote approved — handyman and tenant will be notified');
      await refresh();
    } catch {
      toast.error('Approval failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!apiItem?.submittedQuotationId) {
      toast.error('Connect to the API to decline this quote.');
      return;
    }
    const reason = declineReason.trim() || 'Agent declined — price too high';
    setBusy(true);
    try {
      await declineMaintenanceQuote(apiItem.submittedQuotationId, reason);
      toast.success('Quote declined — workflow returns to get quote or closes per reason');
      setDeclineReason('');
      await refresh();
    } catch {
      toast.error('Decline failed');
    } finally {
      setBusy(false);
    }
  };

  if (!landlordFlow) {
    return (
      <p className="text-muted-foreground rounded-xl border bg-card p-4 text-sm">
        {ctx.workspaceCase.responsibility === 'tenant'
          ? 'Tenant is responsible for arranging and completing this repair.'
          : 'Strata is responsible for this repair. Track progress in the full workspace.'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {awaitingApproval ? (
        <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div>
            <p className="text-primary text-xs font-semibold tracking-wide uppercase">
              Agent decision required
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Accept to notify the handyman with tenant contact details and the tenant with handyman
              details. Reject with a reason — if price is too high the job returns to get quote; if
              the landlord will fix it themselves the job can be closed.
            </p>
            {ctx.item.contractorName ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Contractor: <span className="text-foreground font-medium">{ctx.item.contractorName}</span>
              </p>
            ) : null}
            {ctx.item.quoteAmount != null ? (
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatCurrency(ctx.item.quoteAmount)} inc GST
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={busy} onClick={() => void handleApprove()}>
              Accept quote
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => void handleDecline()}
            >
              Reject quote
            </Button>
          </div>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Rejection reason (e.g. price too high, landlord will fix)"
            className="min-h-[72px] text-xs"
          />
        </section>
      ) : null}

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
