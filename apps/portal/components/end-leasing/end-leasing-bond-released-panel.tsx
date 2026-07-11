'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { SettlementDeductionDialog } from '@/components/end-leasing/settlement-deduction-dialog';
import { TENANT_SETTLEMENT_CONFIRMATION } from '@/constants/end-leasing';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { terminationApi } from '@/lib/termination-case-api';
import { formatCurrency } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';

const DONE = LEASING_ITEM_STATUS.DONE;

function DeductionRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{formatCurrency(amount)}</span>
    </div>
  );
}

export function EndLeasingBondReleasedPanel({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const setSettlementOpen = useEndLeasingStore((s) => s.setSettlementDialogOpen);
  const [busy, setBusy] = useState(false);

  const summary = caseData.reportComparison.settlementSummary;
  const deductions = caseData.settlement.deductions;

  const unpaidRent =
    summary?.unpaidRent ??
    deductions.filter((d) => /rent/i.test(d.category)).reduce((s, d) => s + d.amount, 0);
  const unpaidBills =
    summary?.unpaidBills ??
    deductions
      .filter((d) => /bill|water|utility|fee/i.test(d.category))
      .reduce((s, d) => s + d.amount, 0);
  const otherFees = deductions
    .filter((d) => !/rent|bill|water|utility|repair|maintenance|make.?good/i.test(d.category))
    .reduce((s, d) => s + d.amount, 0);
  const tenantRepair =
    summary?.maintenanceCost ??
    deductions
      .filter((d) => /repair|maintenance|make.?good/i.test(d.category))
      .reduce((s, d) => s + d.amount, 0);
  const totalDeductions = unpaidRent + unpaidBills + otherFees + tenantRepair;
  const bondHeld = summary?.bondHeld ?? caseData.bondHeld;
  const netRefund = Math.max(0, bondHeld - totalDeductions);
  const debtAmount = Math.max(0, totalDeductions - bondHeld);

  const settlementFinalized = caseData.settlement.status === DONE;
  const agentApproved = caseData.agentApproval.decision === 'approved';
  const tenantAccepted =
    caseData.tenantConfirmation.status === TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED;
  const bondReleased = caseData.bond.refundPaid || caseData.bond.status === DONE;

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
        <p className="mb-3 text-sm font-semibold">Bond deduction summary</p>
        <div className="overflow-hidden rounded-xl border divide-y">
          <DeductionRow label="Unpaid rent" amount={unpaidRent} />
          <DeductionRow label="Unpaid water / bills" amount={unpaidBills} />
          <DeductionRow label="Other unpaid fees" amount={otherFees} />
          <DeductionRow label="Tenant repair cost" amount={tenantRepair} />
          <div className="flex items-center justify-between bg-muted/30 px-3 py-2 text-xs">
            <span className="font-semibold">Total deductions</span>
            <span className="font-semibold tabular-nums text-destructive">
              {formatCurrency(totalDeductions)}
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="text-muted-foreground">Bond held</span>
            <span className="font-medium tabular-nums">{formatCurrency(bondHeld)}</span>
          </div>
          <div className="flex items-center justify-between bg-primary/5 px-3 py-2 text-xs">
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

      <section className="space-y-2 rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Release bond</p>
        <p className="text-muted-foreground text-xs">
          Finalize settlement, approve deductions, record tenant acceptance (if replying offline),
          then confirm bond release.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {!settlementFinalized ? (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() =>
                void run(
                  () => terminationApi.finalizeSettlement(caseData.id),
                  'Settlement finalized',
                )
              }
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Finalize settlement
            </Button>
          ) : (
            <span className="text-primary flex items-center gap-1 text-xs">
              <Check className="size-3.5" /> Settlement finalized
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
          {agentApproved && tenantAccepted && !bondReleased ? (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() =>
                void run(
                  () => terminationApi.processBondRefund(caseData.id),
                  'Bond release recorded',
                )
              }
            >
              Confirm bond released
            </Button>
          ) : bondReleased ? (
            <span className="text-primary flex items-center gap-1 text-xs font-semibold">
              <Check className="size-4" /> Bond released
            </span>
          ) : null}
        </div>
      </section>

      <SettlementDeductionDialog caseData={caseData} />
    </div>
  );
}
