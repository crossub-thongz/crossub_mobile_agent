'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import {
  CompletionStep,
  DisputedInvoiceStep,
  InvoiceDecisionStep,
  PaymentStep,
} from '@/components/agent/maintenance-self-managed/invoice-completion-steps';
import { EscalationStep } from '@/components/agent/maintenance-self-managed/escalation-step';
import { InviteTradiesStep } from '@/components/agent/maintenance-self-managed/invite-tradies-step';
import { InvitedTradiesStep } from '@/components/agent/maintenance-self-managed/invited-tradies-step';
import { IssueTriageStep } from '@/components/agent/maintenance-self-managed/issue-triage-step';
import { JobDetailsStep } from '@/components/agent/maintenance-self-managed/job-details-step';
import { ManualControlStep } from '@/components/agent/maintenance-self-managed/manual-control-step';
import { QuoteCompareStep } from '@/components/agent/maintenance-self-managed/quote-compare-step';
import {
  EnterQuoteStep,
  VisitBookingStep,
} from '@/components/agent/maintenance-self-managed/quote-schedule-steps';
import {
  CombineJobStep,
  SplitJobStep,
} from '@/components/agent/maintenance-self-managed/split-combine-step';
import { UrgentDecisionStep } from '@/components/agent/maintenance-self-managed/urgent-decision-step';
import { Button } from '@/components/ui/button';
import { SELF_MANAGED_MAINTENANCE_COPY as COPY } from '@/constants/self-managed-maintenance';
import { useSelfManagedMaintenance } from '@/hooks/use-self-managed-maintenance';
import { selfManagedMaintenanceSteps } from '@/lib/maintenance/self-managed-steps';
import { cn, formatCurrency } from '@/lib/utils';

/**
 * Self-Manage maintenance actions on one job (Phase 1): the steps a CROSSUB Account Manager runs,
 * shown only when they apply to the job's current stage. The server copies the owner on quote
 * decisions above the repair limit, and on sign-off.
 */
export function SelfManagedMaintenancePanel({
  requestId,
  agencyId,
  onChanged,
  heading,
  className,
}: {
  requestId: string;
  agencyId: string | null;
  onChanged?: () => void;
  /** Shown above the steps when the panel stands alone (the full job page). */
  heading?: ReactNode;
  className?: string;
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

  return (
    <div className={cn('space-y-3', className)}>
      {heading}
      <p className="text-muted-foreground text-xs">
        {detail.spendThreshold === null
          ? COPY.ownerCopyNoLimit
          : COPY.ownerCopyLimit(formatCurrency(detail.spendThreshold))}
      </p>

      <ManualControlStep
        requestId={requestId}
        manualControl={detail.manualControl}
        busy={busy}
        run={run}
      />
      {steps.escalations.length > 0 ? (
        <EscalationStep
          requestId={requestId}
          escalations={steps.escalations}
          busy={busy}
          run={run}
        />
      ) : null}
      {steps.urgent ? (
        <UrgentDecisionStep requestId={requestId} agencyId={agencyId} busy={busy} run={run} />
      ) : null}
      {steps.invoiceDecision && match ? (
        <InvoiceDecisionStep requestId={requestId} match={match} busy={busy} run={run} />
      ) : null}
      {steps.disputed && match ? (
        <DisputedInvoiceStep requestId={requestId} match={match} busy={busy} run={run} />
      ) : null}
      {steps.payment && match ? (
        <PaymentStep requestId={requestId} match={match} busy={busy} run={run} />
      ) : null}
      {steps.completion ? (
        <CompletionStep detail={detail} busy={busy} run={run} />
      ) : null}
      {steps.schedule ? (
        <VisitBookingStep
          requestId={requestId}
          proposal={detail.scheduleProposal}
          busy={busy}
          run={run}
        />
      ) : null}
      {steps.compareQuotes ? <QuoteCompareStep detail={detail} busy={busy} run={run} /> : null}
      <JobDetailsStep detail={detail} busy={busy} run={run} />
      {steps.triage ? (
        <IssueTriageStep requestId={requestId} issues={steps.issues} busy={busy} run={run} />
      ) : null}
      {steps.enterQuote ? (
        <InviteTradiesStep
          requestId={requestId}
          agencyId={agencyId}
          invited={detail.invitedContractors}
          busy={busy}
          run={run}
        />
      ) : null}
      {steps.enterQuote && detail.invitedContractors.length > 0 ? (
        <InvitedTradiesStep
          requestId={requestId}
          invited={detail.invitedContractors}
          quotedNames={quotedNames}
          busy={busy}
          run={run}
        />
      ) : null}
      {steps.enterQuote ? (
        <EnterQuoteStep
          requestId={requestId}
          contractors={detail.invitedContractors}
          busy={busy}
          run={run}
        />
      ) : null}
      {steps.triage ? (
        <>
          <SplitJobStep requestId={requestId} busy={busy} run={run} />
          <CombineJobStep requestId={requestId} busy={busy} run={run} />
        </>
      ) : null}
    </div>
  );
}
