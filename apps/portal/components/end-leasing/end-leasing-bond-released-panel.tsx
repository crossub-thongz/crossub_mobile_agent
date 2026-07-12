'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { SettlementDeductionDialog } from '@/components/end-leasing/settlement-deduction-dialog';
import { TENANT_SETTLEMENT_CONFIRMATION, TERMINATION_CASE_STATUS } from '@/constants/end-leasing';
import { communicationsThread } from '@/constants/routes';
import {
  endLeasingKeyReturnDate,
  endLeasingVacateDate,
} from '@/lib/end-leasing/agent-workflow-model';
import { NSW_BOND_RELEASE_URL, jobCompletedAuditTimelineEntries } from '@/lib/end-leasing/vacate-display';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { terminationApi } from '@/lib/termination-case-api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
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
}: {
  caseData: TerminationCaseDetail;
}) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const setSettlementOpen = useEndLeasingStore((s) => s.setSettlementDialogOpen);
  const { properties } = useAgentData();
  const [busy, setBusy] = useState(false);

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
  const agentApproved = caseData.agentApproval.decision === 'approved';
  const tenantAccepted =
    caseData.tenantConfirmation.status === TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED;
  const jobCompleted = caseData.status === TERMINATION_CASE_STATUS.COMPLETED;

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

      {tenantAccepted && (tenantBondEmail?.sentAt || landlordBondEmail?.sentAt) ? (
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
      ) : null}

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Agent confirmation</p>
        <p className="text-muted-foreground text-xs">
          Confirm deduction amounts, release the bond on the NSW Rental Bonds portal, then mark the
          job completed.
        </p>
        <div className="flex flex-wrap gap-2">
          {!settlementFinalized ? (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
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
            <span className="text-primary flex items-center gap-1 text-xs">
              <Check className="size-3.5" /> Amounts confirmed
            </span>
          )}
          {settlementFinalized && !agentApproved ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() =>
                void run(() => terminationApi.agentApprove(caseData.id), 'Settlement approved')
              }
            >
              Approve settlement
            </Button>
          ) : agentApproved ? (
            <span className="text-primary flex items-center gap-1 text-xs">
              <Check className="size-3.5" /> Agent approved
            </span>
          ) : null}
          {agentApproved && !tenantAccepted ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() =>
                void run(
                  () => terminationApi.tenantAcceptSettlement(caseData.id),
                  'Tenant acceptance recorded',
                )
              }
            >
              Record tenant acceptance
            </Button>
          ) : tenantAccepted ? (
            <span className="text-primary flex items-center gap-1 text-xs">
              <Check className="size-3.5" /> Tenant accepted settlement
            </span>
          ) : null}
        </div>

        {agentApproved ? (
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

      <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide">Job completed</p>
        {!jobCompleted ? (
          <>
            <p className="text-muted-foreground mt-1 text-xs">
              Confirm once the bond has been released on the NSW Rental Bonds portal and the case
              is fully closed. If not confirmed, the system sends an automated reminder to the
              managing agent every 2 days.
            </p>
            {auditEntries.length > 0 ? (
              <div className="mt-3 rounded-lg border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide">Audit</p>
                <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                  {auditEntries.map((e) => (
                    <li key={e.id}>
                      {formatDateTime(e.timestamp)} · {e.label}
                      {e.actor ? ` · ${e.actor}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Button
              type="button"
              className="mt-3 w-full font-semibold uppercase tracking-wide"
              disabled={busy || !tenantAccepted}
              onClick={() =>
                void run(
                  () => terminationApi.processBondRefund(caseData.id),
                  'End leasing job completed',
                )
              }
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Job completed
            </Button>
            {!tenantAccepted ? (
              <p className="text-muted-foreground mt-2 text-center text-[10px]">
                Record tenant acceptance before closing the case.
              </p>
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

      <SettlementDeductionDialog caseData={caseData} />
    </div>
  );
}
