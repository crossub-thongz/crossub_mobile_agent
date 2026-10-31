'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import {
  CompletionStep,
  DisputedInvoiceStep,
  InvoiceDecisionStep,
  PaymentStep,
} from '@/components/agent/maintenance-self-managed/invoice-completion-steps';
import { CrossubArrangeStep } from '@/components/agent/maintenance-self-managed/crossub-arrange-step';
import { QuoteAssistanceDialog } from '@/components/agent/maintenance-self-managed/quote-assistance-dialog';
import { EscalationStep } from '@/components/agent/maintenance-self-managed/escalation-step';
import { InviteTradiesStep } from '@/components/agent/maintenance-self-managed/invite-tradies-step';
import { InvitedTradiesStep } from '@/components/agent/maintenance-self-managed/invited-tradies-step';
import { IssueTriageStep } from '@/components/agent/maintenance-self-managed/issue-triage-step';
import { JobDetailsStep } from '@/components/agent/maintenance-self-managed/job-details-step';
import { QuoteCompareStep } from '@/components/agent/maintenance-self-managed/quote-compare-step';
import {
  EnterQuoteStep,
  VisitBookingStep,
} from '@/components/agent/maintenance-self-managed/quote-schedule-steps';
import {
  CombineJobStep,
  SplitJobStep,
} from '@/components/agent/maintenance-self-managed/split-combine-step';
import { ResponsibilityStep } from '@/components/agent/maintenance-self-managed/responsibility-step';
import { StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { UrgentDecisionStep } from '@/components/agent/maintenance-self-managed/urgent-decision-step';
import { WorkOrderStep } from '@/components/agent/maintenance-self-managed/work-order-step';
import { Button } from '@/components/ui/button';
import { SELF_MANAGED_MAINTENANCE_COPY as COPY } from '@/constants/self-managed-maintenance';
import { useSelfManagedMaintenance } from '@/hooks/use-self-managed-maintenance';
import { crossubPaysSupplier } from '@/lib/maintenance/crossub-maintenance';
import { selfManagedMaintenanceSteps } from '@/lib/maintenance/self-managed-steps';
import { cn, formatCurrency } from '@/lib/utils';

/** Admin case stages. When set, only the actions that belong on that board are shown. */
export type SelfManagedMaintenanceStage =
  | 'created'
  | 'review'
  | 'quote'
  | 'approval'
  | 'progress'
  | 'done';

/**
 * Self-Manage maintenance actions on one job (Phase 1): the steps a CROSSUB Account Manager runs,
 * shown only when they apply to the job's current stage. The server copies the owner on quote
 * decisions above the repair limit, and on sign-off. Nothing on the job runs by itself: the
 * server records Cros's calls as recommendations (who pays, separate jobs) for the agent to take.
 */
export function SelfManagedMaintenancePanel({
  requestId,
  agencyId,
  onChanged,
  heading,
  className,
  stage,
}: {
  requestId: string;
  agencyId: string | null;
  onChanged?: () => void;
  /** Shown above the steps when the panel stands alone (the full job page). */
  heading?: ReactNode;
  className?: string;
  /** Limit the actions to one admin stage board. */
  stage?: SelfManagedMaintenanceStage;
}) {
  const { detail, error, busy, reload, run } = useSelfManagedMaintenance(requestId, onChanged);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-destructive text-xs">{error || COPY.loadFailed}</p>
        <Button size="sm" variant="outline" onClick={reload}>
          {COPY.retry}
        </Button>
      </div>
    );
  }
  if (!detail) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        {COPY.loading}
      </p>
    );
  }
  // The server refuses these actions off Self-Manage; never offer them there.
  if (!detail.selfManaged) return null;

  const steps = selfManagedMaintenanceSteps(detail);
  if (!steps.open) return null;
  const match = detail.invoiceMatch;
  const quotedNames = new Set(
    detail.quotes.map((q) => q.contractorName).filter((name): name is string => name !== null),
  );
  const on = (allowed: SelfManagedMaintenanceStage[]) => !stage || allowed.includes(stage);
  const showEscalation = on(['review']) && steps.escalations.length > 0;
  const showUrgent = on(['review']) && Boolean(steps.urgent);
  const showInvoice = on(['progress', 'done']) && Boolean(steps.invoiceDecision && match);
  const showDisputed = on(['progress', 'done']) && Boolean(steps.disputed && match);
  const showPayment = on(['progress', 'done']) && Boolean(steps.payment && match);
  const showCompletion = on(['progress', 'done']) && Boolean(steps.completion);
  const showSchedule = on(['progress']) && Boolean(steps.schedule);
  const showCompare = on(['quote', 'approval']) && Boolean(steps.compareQuotes);
  const showWorkOrder = on(['progress']) && Boolean(steps.workOrder && detail.workOrder);
  const showResponsibility = on(['review']);
  const showJobDetails = !stage;
  const showTriage = on(['review']) && Boolean(steps.triage);
  const showQuotes = on(['quote']) && Boolean(steps.enterQuote);
  const showSplit = !stage && Boolean(steps.triage);
  const anyAction =
    showEscalation ||
    showUrgent ||
    showInvoice ||
    showDisputed ||
    showPayment ||
    showCompletion ||
    showSchedule ||
    showCompare ||
    showWorkOrder ||
    showResponsibility ||
    showJobDetails ||
    showTriage ||
    showQuotes ||
    showSplit;
  if (stage && !anyAction) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {stage ? null : heading}
      {stage ? null : (
        <p className="text-muted-foreground text-xs">
          {detail.spendThreshold === null
            ? COPY.ownerCopyNoLimit
            : COPY.ownerCopyLimit(formatCurrency(detail.spendThreshold))}
        </p>
      )}
      {stage ? null : <p className="text-muted-foreground text-xs">{COPY.advisoryHint}</p>}

      {showEscalation ? (
        <EscalationStep
          requestId={requestId}
          escalations={steps.escalations}
          busy={busy}
          run={run}
        />
      ) : null}
      {showUrgent ? (
        <UrgentDecisionStep requestId={requestId} agencyId={agencyId} busy={busy} run={run} />
      ) : null}
      {showInvoice && match ? (
        <InvoiceDecisionStep requestId={requestId} match={match} busy={busy} run={run} />
      ) : null}
      {showDisputed && match ? (
        <DisputedInvoiceStep requestId={requestId} match={match} busy={busy} run={run} />
      ) : null}
      {showPayment && match ? (
        crossubPaysSupplier(detail.quotes) ? (
          <StepCard title={COPY.paymentTitle}>
            <p className="text-muted-foreground text-xs">{COPY.crossubSupplierPaid}</p>
          </StepCard>
        ) : (
          <PaymentStep requestId={requestId} match={match} busy={busy} run={run} />
        )
      ) : null}
      {showCompletion ? <CompletionStep detail={detail} busy={busy} run={run} /> : null}
      {showSchedule ? (
        <VisitBookingStep
          requestId={requestId}
          proposal={detail.scheduleProposal}
          busy={busy}
          run={run}
        />
      ) : null}
      {showCompare ? <QuoteCompareStep detail={detail} busy={busy} run={run} /> : null}
      {showWorkOrder && detail.workOrder ? <WorkOrderStep workOrder={detail.workOrder} /> : null}
      {showResponsibility ? <ResponsibilityStep detail={detail} busy={busy} run={run} /> : null}
      {showJobDetails ? <JobDetailsStep detail={detail} busy={busy} run={run} /> : null}
      {showTriage ? (
        <IssueTriageStep requestId={requestId} issues={steps.issues} busy={busy} run={run} />
      ) : null}
      {showQuotes ? (
        <QuoteAssistanceDialog requestId={requestId} busy={busy} run={run} />
      ) : null}
      {showQuotes && detail.crossubMaintenance ? (
        <CrossubArrangeStep
          requestId={requestId}
          offer={detail.crossubMaintenance}
          busy={busy}
          run={run}
        />
      ) : null}
      {showQuotes ? (
        <InviteTradiesStep
          requestId={requestId}
          agencyId={agencyId}
          invited={detail.invitedContractors}
          busy={busy}
          run={run}
        />
      ) : null}
      {showQuotes && detail.invitedContractors.length > 0 ? (
        <InvitedTradiesStep
          requestId={requestId}
          invited={detail.invitedContractors}
          quotedNames={quotedNames}
          busy={busy}
          run={run}
        />
      ) : null}
      {showQuotes ? (
        <EnterQuoteStep
          requestId={requestId}
          contractors={detail.invitedContractors}
          busy={busy}
          run={run}
        />
      ) : null}
      {showSplit ? (
        <>
          <SplitJobStep requestId={requestId} busy={busy} run={run} />
          <CombineJobStep requestId={requestId} busy={busy} run={run} />
        </>
      ) : null}
    </div>
  );
}
