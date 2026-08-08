'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  BondConfirmationChecklist,
  BondConfirmationChecklistItem,
} from '@/components/end-leasing/bond-confirmation-checklist';
import { SettlementDeductionDialog } from '@/components/end-leasing/settlement-deduction-dialog';
import {
  TENANT_SETTLEMENT_CONFIRMATION,
  TERMINATION_AGENT_DECISION,
  TERMINATION_CASE_STATUS,
} from '@/constants/end-leasing';
import { communicationsThread } from '@/constants/routes';
import {
  endLeasingKeyReturnDate,
  endLeasingVacateDate,
} from '@/lib/end-leasing/agent-workflow-model';
import { NSW_BOND_RELEASE_URL, jobCompletedAuditTimelineEntries } from '@/lib/end-leasing/vacate-display';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { LIVE_POLL_MS } from '@/lib/live-sync';
import { terminationApi } from '@/lib/termination-case-api';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';

const DONE = LEASING_ITEM_STATUS.DONE;

function BondSummaryEmailCard({
  title,
  email,
}: {
  title: string;
  email: NonNullable<TerminationCaseDetail['reportComparison']['tenantBondSummaryEmail']>;
}) {
  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{title}</p>
        {email.commConversationId ? (
          <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-[10px]">
            <Link href={communicationsThread(email.commConversationId)}>
              <ExternalLink className="size-3" />
              Message Center
            </Link>
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground">
        To: {email.to} · {email.sentAt ? formatDateTime(email.sentAt) : 'Sent'}
      </p>
    </div>
  );
}

function DeductionLine({
  label,
  amount,
  description,
}: {
  label: string;
  amount: number;
  description?: string;
}) {
  return (
    <div className="px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{formatCurrency(amount)}</span>
      </div>
      {description ? (
        <p className="text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}

function jobCompleteAudit(caseData: TerminationCaseDetail) {
  return jobCompletedAuditTimelineEntries(caseData);
}

export function EndLeasingBondReleasedPanel({
  caseData,
  showAgentActions = true,
}: {
  caseData: TerminationCaseDetail;
  showAgentActions?: boolean;
}) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const refreshCase = useEndLeasingStore((s) => s.refreshCase);
  const setSettlementOpen = useEndLeasingStore((s) => s.setSettlementDialogOpen);
  const { properties } = useAgentData();
  const [busy, setBusy] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const property = useMemo(
    () => properties.find((p) => p.id === caseData.propertyId) ?? null,
    [properties, caseData.propertyId],
  );

  const summary = caseData.reportComparison.settlementSummary;
  const deductions = caseData.settlement.deductions;
  const vacateDate = endLeasingVacateDate(caseData);
  const keyReturnDate = endLeasingKeyReturnDate(caseData);
  const rentPaidTo = property?.rentPaidUntil ?? null;

  const rentDeductions = deductions.filter((d) => /rent/i.test(d.category));
  const billDeductions = deductions.filter((d) => /bill|water|utility|fee/i.test(d.category));
  const repairDeductions = deductions.filter((d) => /repair|maintenance|make.?good/i.test(d.category));

  const unpaidRent =
    summary?.unpaidRent ?? rentDeductions.reduce((s, d) => s + d.amount, 0);
  const unpaidBills =
    summary?.unpaidBills ?? billDeductions.reduce((s, d) => s + d.amount, 0);
  const tenantRepair =
    summary?.maintenanceCost ?? repairDeductions.reduce((s, d) => s + d.amount, 0);

  const billsDescription = billDeductions.map((d) => d.description).filter(Boolean).join('\n');
  const repairDescription = repairDeductions.map((d) => d.description).filter(Boolean).join('\n');

  const totalDeductions = unpaidRent + unpaidBills + tenantRepair;
  const bondHeld = summary?.bondHeld ?? caseData.bondHeld;
  const netRefund = Math.max(0, bondHeld - totalDeductions);
  const debtAmount = Math.max(0, totalDeductions - bondHeld);

  const settlementFinalized = caseData.settlement.status === DONE;
  const agentReviewed =
    caseData.agentApproval.decision === TERMINATION_AGENT_DECISION.APPROVED ||
    caseData.agentApproval.decision === TERMINATION_AGENT_DECISION.ADJUSTMENT;
  const agentAmountsConfirmed = settlementFinalized && agentReviewed;
  const tenantConfirmationStatus = caseData.tenantConfirmation.status;
  const tenantAccepted =
    tenantConfirmationStatus === TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED;
  const tenantDeclined =
    tenantConfirmationStatus === TENANT_SETTLEMENT_CONFIRMATION.DECLINED;
  const jobCompleted = caseData.status === TERMINATION_CASE_STATUS.COMPLETED;
  const checklistComplete = agentAmountsConfirmed && tenantAccepted;

  useEffect(() => {
    const shouldPoll =
      tenantConfirmationStatus === TENANT_SETTLEMENT_CONFIRMATION.PENDING ||
      (checklistComplete && !jobCompleted);
    if (!shouldPoll) return;
    const timer = window.setInterval(() => {
      void refreshCase(caseData.id);
    }, LIVE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [
    caseData.id,
    checklistComplete,
    jobCompleted,
    refreshCase,
    tenantConfirmationStatus,
  ]);

  const tenantSettlementDescription = tenantAccepted
    ? `Tenant accepted in the tenant app${
        caseData.tenantConfirmation.confirmedAt
          ? ` · ${formatDateTime(caseData.tenantConfirmation.confirmedAt)}`
          : ''
      }`
    : tenantDeclined
      ? `Tenant declined in the tenant app${
          caseData.tenantConfirmation.confirmedAt
            ? ` · ${formatDateTime(caseData.tenantConfirmation.confirmedAt)}`
            : ''
        }${caseData.tenantConfirmation.declineReason ? `\n${caseData.tenantConfirmation.declineReason}` : ''}`
      : caseData.tenantConfirmation.dueAt
        ? `Awaiting tenant response in the tenant app · due ${formatDateTime(caseData.tenantConfirmation.dueAt)}`
        : 'Awaiting tenant response in the tenant app';

  const auditEntries = jobCompleteAudit(caseData);
  const jobCompletedAt = auditEntries.find((e) => /^Job completed confirmed/i.test(e.label));
  const tenantBondEmail = caseData.reportComparison.tenantBondSummaryEmail;
  const landlordBondEmail = caseData.reportComparison.landlordBondSummaryEmail;

  const run = async (action: () => Promise<TerminationCaseDetail>, success: string) => {
    setBusy(true);
    try {
      const updated = await action();
      applyCase(updated);
      toast.success(success);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Bond summary</p>
        <dl className="mb-4 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Bond amount</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatCurrency(bondHeld)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rent to date</dt>
            <dd className="font-medium">{rentPaidTo ? formatDate(rentPaidTo) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vacate date</dt>
            <dd className="font-medium">{vacateDate ? formatDate(vacateDate) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Key return date</dt>
            <dd className="font-medium">{keyReturnDate ? formatDate(keyReturnDate) : '—'}</dd>
          </div>
        </dl>

        <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
          Deduct
        </p>
        <div className="overflow-hidden rounded-xl border divide-y">
          <DeductionLine label="Unpaid rent" amount={unpaidRent} />
          <DeductionLine
            label="Unpaid bills"
            amount={unpaidBills}
            description={billsDescription || undefined}
          />
          <DeductionLine
            label="Repair cost"
            amount={tenantRepair}
            description={repairDescription || undefined}
          />
          <div className="flex items-center justify-between bg-muted/30 px-3 py-2.5 text-xs">
            <span className="font-semibold">Total deductions</span>
            <span className="font-semibold tabular-nums text-destructive">
              {formatCurrency(totalDeductions)}
            </span>
          </div>
          <div className="flex items-center justify-between bg-primary/5 px-3 py-2.5 text-xs">
            <span className="font-semibold">
              {debtAmount > 0 ? 'Debt owing' : 'Refund to tenant'}
            </span>
            <span className="text-primary font-semibold tabular-nums">
              {debtAmount > 0 ? formatCurrency(debtAmount) : formatCurrency(netRefund)}
            </span>
          </div>
        </div>
        {deductions.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-2 h-8 px-0 text-xs"
            onClick={() => setSettlementOpen(true)}
          >
            View full deductions breakdown
          </Button>
        ) : null}
      </section>

      {/* {tenantAccepted && (tenantBondEmail?.sentAt || landlordBondEmail?.sentAt) ? (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Bond summary emailed</p>
          <p className="text-muted-foreground text-xs">
            The bond settlement summary above was automatically sent to the tenant and landlord when
            tenant acceptance was recorded.
          </p>
          {tenantBondEmail?.sentAt ? (
            <BondSummaryEmailCard title="Tenant" email={tenantBondEmail} />
          ) : null}
          {landlordBondEmail?.sentAt ? (
            <BondSummaryEmailCard title="Landlord" email={landlordBondEmail} />
          ) : null}
        </section>
      ) : null} */}

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Agent confirmation</p>
        <p className="text-muted-foreground text-xs">
          Confirm deduction amounts, release the bond on the NSW Rental Bonds portal, then the job
          completes automatically once the tenant accepts in the tenant app.
        </p>

        <BondConfirmationChecklist>
          <BondConfirmationChecklistItem
            state={agentAmountsConfirmed ? 'done' : 'pending'}
            title="Amount confirmed and approved by agent"
            description={
              agentAmountsConfirmed
                ? 'Deduction amounts are finalized and approved by the managing agent.'
                : settlementFinalized
                  ? 'Amounts confirmed — approve settlement to continue.'
                  : 'Confirm deduction amounts, then approve the settlement.'
            }
            action={
              showAgentActions && !agentAmountsConfirmed ? (
                <div className="flex flex-wrap gap-2">
                  {!settlementFinalized ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 bg-primary text-xs font-semibold shadow-md ring-2 ring-primary/25 hover:bg-primary/90"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => terminationApi.finalizeSettlement(caseData.id),
                          'Deduction amounts confirmed',
                        )
                      }
                    >
                      Confirm amounts
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 bg-primary text-xs font-semibold shadow-md ring-2 ring-primary/25 hover:bg-primary/90"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => terminationApi.agentApprove(caseData.id),
                          'Settlement approved',
                        )
                      }
                    >
                      Approve settlement
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          />
          <BondConfirmationChecklistItem
            state={
              tenantAccepted ? 'done' : tenantDeclined ? 'declined' : 'pending'
            }
            title="Tenant accepted settlement"
            description={tenantSettlementDescription}
          />
        </BondConfirmationChecklist>

        {showAgentActions && agentReviewed ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-2 text-xs"
            asChild
          >
            <a href={NSW_BOND_RELEASE_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Release bond (NSW Rental Bonds)
            </a>
          </Button>
        ) : null}
      </section>

      {showAgentActions ? (
      <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide">Job completed</p>
        {!jobCompleted ? (
          <>
            <p className="text-muted-foreground mt-1 text-xs">
              {checklistComplete
                ? 'The confirmation checklist is complete — the end leasing job will close automatically.'
                : 'Once agent confirmation and tenant acceptance are both complete, the end leasing job closes automatically.'}
            </p>
            {checklistComplete ? (
              <p className="text-primary mt-3 flex items-center gap-2 text-sm font-medium">
                <Loader2 className="size-4 animate-spin" />
                Completing job…
              </p>
            ) : null}
            {auditEntries.length > 0 ? (
              <div className="mt-3 rounded-lg border bg-card">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                  onClick={() => setAuditExpanded((value) => !value)}
                  aria-expanded={auditExpanded}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide">Audit</p>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    {auditEntries.length} event{auditEntries.length === 1 ? '' : 's'}
                    <ChevronDown
                      className={cn('size-3.5 transition-transform', auditExpanded && 'rotate-180')}
                    />
                  </span>
                </button>
                {auditExpanded ? (
                  <ul className="text-muted-foreground space-y-1 border-t px-3 py-2 text-xs">
                    {auditEntries.map((e) => (
                      <li key={e.id}>
                        {formatDateTime(e.timestamp)} · {e.label}
                        {e.actor ? ` · ${e.actor}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-primary mt-2 flex items-center gap-2 text-sm font-medium">
            <Check className="size-4" />
            Job completed
            {jobCompletedAt ? (
              <span className="text-muted-foreground text-xs font-normal">
                · {formatDateTime(jobCompletedAt.timestamp)}
                {jobCompletedAt.actor ? ` · ${jobCompletedAt.actor}` : ''}
              </span>
            ) : null}
          </p>
        )}
      </section>
      ) : null}

      <SettlementDeductionDialog caseData={caseData} />
    </div>
  );
}
