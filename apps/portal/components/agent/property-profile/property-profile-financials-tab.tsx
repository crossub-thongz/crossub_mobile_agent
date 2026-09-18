'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircleDollarSign, ChevronRight, FileText, Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';

import { InvoiceEditorDialog } from '@/components/accounting/invoice-editor-dialog';
import { RentReconciliationCaseDialog } from '@/components/accounting/rent-reconciliation-case-dialog';
import {
  CreateTribunalRentChasingDialog,
  type ArrearsKind,
} from '@/components/agent/create-tribunal-rent-chasing-dialog';
import { RentChasingArrearsDialog } from '@/components/agent/rent-chasing-arrears-dialog';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ACCOUNTING_MODULE_LAUNCHED } from '@/constants/accounting-sections';
import type { PropertyWorkflowActionId } from '@/lib/property-workflow-actions';
import {
  fetchAgentTribunalRentChasingPrefill,
  type AgentTribunalRentChasingPrefill,
} from '@/lib/crossub-api/agent-workflow-client';
import {
  buildPropertyFinancialSnapshot,
  buildPropertyRentLedgerRows,
  type PropertyRentLedgerRow,
} from '@/lib/property-profile-financials';
import { hasPropertyAccountingData } from '@/lib/property-portal-accounting';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import type { Property } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

import '@/components/agent/property-profile/property-profile-v2.css';

const LEDGER_PREVIEW_LIMIT = 5;

type ArrearsKind = 'rent' | 'bill' | 'bond';

function SnapshotCard({
  label,
  value,
  subtext,
  subtextClassName,
}: {
  label: string;
  value: string;
  subtext?: string;
  subtextClassName?: string;
}) {
  return (
    <div className="property-profile-v2__metric rounded-2xl border bg-background/40 px-4 py-3">
      <p className="text-muted-foreground text-[10px] font-medium">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold leading-tight tabular-nums">{value}</p>
      {subtext ? (
        <p className={cn('mt-1 text-xs', subtextClassName ?? 'text-muted-foreground')}>{subtext}</p>
      ) : null}
    </div>
  );
}

function LedgerStatusBadge({ status }: { status: PropertyRentLedgerRow['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        status === 'paid' && 'bg-primary/12 text-primary',
        status === 'outstanding' && 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
        status === 'overdue' && 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
      )}
    >
      {status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Outstanding'}
    </span>
  );
}

function daysOverdueLabel(days: number | null | undefined): string {
  if (days == null || days <= 0) return 'No days overdue';
  return `${days} day${days === 1 ? '' : 's'} overdue`;
}

function summarizeKind(
  prefill: AgentTribunalRentChasingPrefill | null,
  kind: ArrearsKind,
): {
  amount: number | null;
  days: number | null;
  hasItems: boolean;
  rows: AgentTribunalRentChasingPrefill['arrears'];
} {
  const rows = prefill?.arrears.filter((row) => row.kind === kind) ?? [];
  const amountFromRows = rows.reduce<number | null>((sum, row) => {
    if (row.amount == null) return sum;
    return (sum ?? 0) + row.amount;
  }, null);
  const daysFromRows = rows.reduce<number | null>((max, row) => {
    if (row.daysOverdue == null) return max;
    return Math.max(max ?? 0, row.daysOverdue);
  }, null);

  if (kind === 'rent') {
    const rentAmount = prefill?.rentArrears?.rentAmount ?? amountFromRows;
    return {
      amount: rentAmount ?? null,
      days: daysFromRows,
      hasItems: rows.length > 0 || prefill?.rentArrears != null,
      rows,
    };
  }
  if (kind === 'bill') {
    const bills = prefill?.billArrears ?? [];
    const billTotal = bills.reduce<number | null>((sum, bill) => {
      if (bill.amount == null) return sum;
      return (sum ?? 0) + bill.amount;
    }, null);
    return {
      amount: billTotal ?? amountFromRows,
      days: daysFromRows,
      hasItems: rows.length > 0 || bills.length > 0,
      rows,
    };
  }
  return {
    amount: prefill?.bondArrears?.bondAmount ?? amountFromRows,
    days: daysFromRows,
    hasItems: rows.length > 0 || prefill?.bondArrears != null,
    rows,
  };
}

function ArrearsKindCard({
  title,
  empty,
  icon: Icon,
  amount,
  days,
  hasItems,
  details,
  onRecord,
  onView,
}: {
  title: string;
  empty: string;
  icon: typeof CircleDollarSign;
  amount: number | null;
  days: number | null;
  hasItems: boolean;
  details: { label: string; value: string }[];
  onRecord: () => void;
  onView: () => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-xl border bg-card shadow-sm">
      <div className="border-b px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{title}</p>
              <p className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
                {hasItems ? daysOverdueLabel(days) : 'No items'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={onRecord}
          >
            Record
          </Button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-3 py-3">
        {hasItems ? (
          <>
            <p className="text-lg font-semibold tabular-nums">
              {amount != null ? formatCurrency(amount) : '—'}
            </p>
            {details.length > 0 ? (
              <dl className="space-y-2">
                {details.map((item) => (
                  <div key={item.label}>
                    <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <button
              type="button"
              onClick={onView}
              className="text-primary mt-auto inline-flex items-center gap-1 text-xs font-semibold"
            >
              View details
              <ChevronRight className="size-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-3">
            <p className="text-muted-foreground text-sm">{empty}</p>
            <button
              type="button"
              onClick={onRecord}
              className="text-primary inline-flex items-center gap-1 text-xs font-semibold"
            >
              Record arrears
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PropertyProfileFinancialsTab({
  property,
  propertyId,
  accounting: fallbackAccounting,
  onRefresh,
  initialWorkflowAction,
  onInitialWorkflowActionHandled,
  onOpenFees,
  onOpenBills,
}: {
  property: Property;
  propertyId: string;
  accounting?: import('@/lib/types').PropertyAccounting | null;
  onRefresh?: () => void;
  initialWorkflowAction?: PropertyWorkflowActionId | null;
  onInitialWorkflowActionHandled?: () => void;
  onOpenFees?: () => void;
  onOpenBills?: () => void;
}) {
  const { apiConnected, primaryAgency, properties } = useAgentData();
  const { detail, refresh: refreshPortalDetail } = usePropertyPortalDetail(
    propertyId,
    apiConnected,
  );
  const sync = usePropertyOverviewSync(property, apiConnected);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [rentReconOpen, setRentReconOpen] = useState(false);
  const [rentChasingOpen, setRentChasingOpen] = useState(false);
  const [recordKind, setRecordKind] = useState<ArrearsKind | null>(null);
  const [arrearsDialogOpen, setArrearsDialogOpen] = useState(false);
  const [showFullLedger, setShowFullLedger] = useState(false);
  const [prefill, setPrefill] = useState<AgentTribunalRentChasingPrefill | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const searchParams = useSearchParams();

  const portalAccounting = detail?.accounting ?? sync.accounting ?? null;
  const portalFinancial = detail?.financial ?? sync.financial ?? null;

  const snapshot = useMemo(
    () =>
      buildPropertyFinancialSnapshot({
        property,
        record: sync.record,
        overview: sync.overview ?? detail?.overview ?? null,
        portalAccounting,
        portalFinancial,
        fallbackAccounting,
      }),
    [
      property,
      sync.record,
      sync.overview,
      detail?.overview,
      portalAccounting,
      portalFinancial,
      fallbackAccounting,
    ],
  );

  const ledgerRows = useMemo(
    () =>
      buildPropertyRentLedgerRows({
        portalAccounting,
        fallbackAccounting,
      }),
    [portalAccounting, fallbackAccounting],
  );

  const visibleLedgerRows = showFullLedger
    ? ledgerRows
    : ledgerRows.slice(0, LEDGER_PREVIEW_LIMIT);
  const hasMoreLedger = ledgerRows.length > LEDGER_PREVIEW_LIMIT && !showFullLedger;

  const hasData = hasPropertyAccountingData({
    accounting: portalAccounting,
    fallback: fallbackAccounting ?? undefined,
  });

  const loadPrefill = useCallback(() => {
    if (!propertyId) return;
    setPrefillLoading(true);
    void fetchAgentTribunalRentChasingPrefill(propertyId)
      .then(setPrefill)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Could not load arrears');
      })
      .finally(() => setPrefillLoading(false));
  }, [propertyId]);

  useEffect(() => {
    loadPrefill();
  }, [loadPrefill]);

  const refreshArrears = useCallback(() => {
    loadPrefill();
    void refreshPortalDetail();
    void onRefresh?.();
  }, [loadPrefill, onRefresh, refreshPortalDetail]);

  useEffect(() => {
    if (!initialWorkflowAction) return;
    if (initialWorkflowAction === 'create_rent_reconciliation') {
      if (ACCOUNTING_MODULE_LAUNCHED) setRentReconOpen(true);
      onInitialWorkflowActionHandled?.();
      return;
    }
    if (initialWorkflowAction === 'open_invoice_management') {
      if (ACCOUNTING_MODULE_LAUNCHED) {
        if (!primaryAgency) {
          toast.error('Complete your agency profile before creating invoices');
        } else {
          setInvoiceOpen(true);
        }
      }
      onInitialWorkflowActionHandled?.();
      return;
    }
    if (initialWorkflowAction === 'open_rent_chasing') {
      setRecordKind(null);
      setRentChasingOpen(true);
      onInitialWorkflowActionHandled?.();
    }
  }, [initialWorkflowAction, onInitialWorkflowActionHandled, primaryAgency]);

  useEffect(() => {
    if (searchParams.get('focus') !== 'arrears') return;
    setArrearsDialogOpen(true);
  }, [searchParams]);

  const openRecord = (kind: ArrearsKind | null = null) => {
    setRecordKind(kind);
    setRentChasingOpen(true);
  };

  const rentSummary = summarizeKind(prefill, 'rent');
  const billSummary = summarizeKind(prefill, 'bill');
  const bondSummary = summarizeKind(prefill, 'bond');

  const rentDetails = [
    prefill?.rentArrears?.paymentCycle
      ? { label: 'Payment cycle', value: prefill.rentArrears.paymentCycle }
      : null,
    prefill?.rentArrears?.rentPaidTo
      ? { label: 'Rent paid to', value: formatDate(prefill.rentArrears.rentPaidTo) }
      : null,
    rentSummary.rows[0]?.dueDate
      ? { label: 'Due', value: formatDate(rentSummary.rows[0].dueDate) }
      : null,
  ].filter((item): item is { label: string; value: string } => item != null);

  const billDetails = (prefill?.billArrears ?? []).slice(0, 3).map((bill) => ({
    label: bill.billName ?? bill.billType ?? 'Bill',
    value: [
      bill.amount != null ? formatCurrency(bill.amount) : null,
      bill.dueDate ? formatDate(bill.dueDate) : null,
    ]
      .filter(Boolean)
      .join(' · ') || '—',
  }));

  const bondDetails = [
    prefill?.bondArrears?.agreementEndDate
      ? { label: 'Agreement end', value: formatDate(prefill.bondArrears.agreementEndDate) }
      : null,
    prefill?.bondArrears?.notes?.trim()
      ? { label: 'Notes', value: prefill.bondArrears.notes.trim() }
      : null,
  ].filter((item): item is { label: string; value: string } => item != null);

  return (
    <div className="space-y-5">
      <section id="rent-chasing-arrears" className="space-y-3 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Arrears</h3>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => openRecord()}
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
            >
              Record arrears
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setArrearsDialogOpen(true)}
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
            >
              View / mark paid
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {prefillLoading && !prefill ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-xl border px-4 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading arrears…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-stretch">
            <ArrearsKindCard
              title="Rent Arrears"
              empty="No rent arrears recorded on this property."
              icon={CircleDollarSign}
              amount={rentSummary.amount}
              days={rentSummary.days}
              hasItems={rentSummary.hasItems}
              details={rentDetails}
              onRecord={() => openRecord('rent')}
              onView={() => setArrearsDialogOpen(true)}
            />
            <ArrearsKindCard
              title="Bill Arrears"
              empty="No bill arrears recorded on this property."
              icon={Receipt}
              amount={billSummary.amount}
              days={billSummary.days}
              hasItems={billSummary.hasItems}
              details={billDetails}
              onRecord={() => openRecord('bill')}
              onView={() => setArrearsDialogOpen(true)}
            />
            <ArrearsKindCard
              title="Bond Arrears"
              empty="No bond arrears recorded on this property."
              icon={FileText}
              amount={bondSummary.amount}
              days={bondSummary.days}
              hasItems={bondSummary.hasItems}
              details={bondDetails}
              onRecord={() => openRecord('bond')}
              onView={() => setArrearsDialogOpen(true)}
            />
          </div>
        )}
      </section>

      {ACCOUNTING_MODULE_LAUNCHED ? (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Financial snapshot</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SnapshotCard
                label="Rent Paid Up To"
                value={snapshot.rentPaidUpToLabel}
                subtext={snapshot.rentStatusLabel}
                subtextClassName={
                  snapshot.rentStatusTone === 'good'
                    ? 'text-primary'
                    : snapshot.rentStatusTone === 'warn'
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-muted-foreground'
                }
              />
              <button
                type="button"
                onClick={() => setArrearsDialogOpen(true)}
                className="text-left"
              >
                <SnapshotCard
                  label="Arrears"
                  value={snapshot.arrearsAmountLabel}
                  subtext={snapshot.arrearsDaysLabel}
                />
              </button>
              <SnapshotCard
                label="Next Disbursement"
                value={snapshot.nextDisbursementDateLabel}
                subtext={snapshot.nextDisbursementEstimateLabel}
              />
              <button
                type="button"
                onClick={onOpenFees}
                className={cn('text-left', !onOpenFees && 'pointer-events-none')}
              >
                <SnapshotCard
                  label="Management Fee"
                  value={snapshot.managementFeeLabel}
                  subtext={snapshot.managementFeeSubLabel}
                />
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="inline-flex rounded-full border bg-muted/20 px-3 py-1.5">
              <h3 className="text-sm font-semibold">Rent Ledger</h3>
            </div>

            {visibleLedgerRows.length === 0 ? (
              <div className="v2-dashboard__card rounded-2xl border px-4 py-8 text-center">
                <p className="text-sm font-medium">No Rent Ledger Entries Yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Record a rent reconciliation from Actions to start the ledger for this property.
                </p>
                <button
                  type="button"
                  onClick={() => setRentReconOpen(true)}
                  className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                >
                  Record Reconciliation
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-muted-foreground text-left text-[11px]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Due Date</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLedgerRows.map((row) => (
                      <tr key={row.id} className="border-t border-border/50">
                        <td className="px-4 py-3 tabular-nums">{row.dueDate}</td>
                        <td className="px-4 py-3 font-medium">{row.description}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <LedgerStatusBadge status={row.status} />
                        </td>
                        <td className="text-muted-foreground px-4 py-3 tabular-nums">
                          {row.paidDate ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hasMoreLedger ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowFullLedger(true)}
                  className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
                >
                  View Full Ledger
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ) : null}

            {!hasData && ledgerRows.length > 0 ? (
              <p className="text-muted-foreground text-xs">
                Showing recorded rent entries for this property.
              </p>
            ) : null}

            {onOpenBills ? (
              <div className="flex flex-wrap gap-4 text-sm">
                <button
                  type="button"
                  onClick={onOpenBills}
                  className="text-primary font-semibold hover:underline"
                >
                  View bills
                </button>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      <InvoiceEditorDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        mode="create"
        agency={primaryAgency}
        properties={properties}
        onSaved={() => {
          setInvoiceOpen(false);
          toast.success('Invoice saved');
        }}
      />

      <RentReconciliationCaseDialog
        open={rentReconOpen}
        onOpenChange={setRentReconOpen}
        propertyId={propertyId}
        property={property}
        fallbackAccounting={fallbackAccounting}
        onSubmitted={() => {
          void refreshPortalDetail();
          void onRefresh?.();
          setShowFullLedger(true);
        }}
      />

      <CreateTribunalRentChasingDialog
        open={rentChasingOpen}
        onOpenChange={(open) => {
          setRentChasingOpen(open);
          if (!open) setRecordKind(null);
        }}
        propertyId={propertyId}
        properties={properties}
        mode="rent_chasing"
        initialKind={recordKind}
        onCreated={() => {
          setRentChasingOpen(false);
          setRecordKind(null);
          refreshArrears();
        }}
      />

      <RentChasingArrearsDialog
        open={arrearsDialogOpen}
        onOpenChange={setArrearsDialogOpen}
        propertyId={propertyId}
        subtitle={snapshot.arrearsDaysLabel}
        onPaid={() => {
          refreshArrears();
        }}
      />
    </div>
  );
}
