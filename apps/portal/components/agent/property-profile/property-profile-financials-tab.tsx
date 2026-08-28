'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { InvoiceEditorDialog } from '@/components/accounting/invoice-editor-dialog';
import { RentReconciliationCaseDialog } from '@/components/accounting/rent-reconciliation-case-dialog';
import { CreateTribunalRentChasingDialog } from '@/components/agent/create-tribunal-rent-chasing-dialog';
import { RentChasingArrearsDialog } from '@/components/agent/rent-chasing-arrears-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { PropertyWorkflowActionId } from '@/lib/property-workflow-actions';
import {
  buildPropertyFinancialSnapshot,
  buildPropertyRentLedgerRows,
  type PropertyRentLedgerRow,
} from '@/lib/property-profile-financials';
import { hasPropertyAccountingData } from '@/lib/property-portal-accounting';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import type { Property } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

import '@/components/agent/property-profile/property-profile-v2.css';

const LEDGER_PREVIEW_LIMIT = 5;

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
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
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
  const [arrearsDialogOpen, setArrearsDialogOpen] = useState(false);
  const [showFullLedger, setShowFullLedger] = useState(false);

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

  useEffect(() => {
    if (!initialWorkflowAction) return;
    if (initialWorkflowAction === 'create_rent_reconciliation') {
      setRentReconOpen(true);
      onInitialWorkflowActionHandled?.();
      return;
    }
    if (initialWorkflowAction === 'open_invoice_management') {
      if (!primaryAgency) {
        toast.error('Complete your agency profile before creating invoices');
      } else {
        setInvoiceOpen(true);
      }
      onInitialWorkflowActionHandled?.();
      return;
    }
    if (initialWorkflowAction === 'open_rent_chasing') {
      setRentChasingOpen(true);
      onInitialWorkflowActionHandled?.();
    }
  }, [initialWorkflowAction, onInitialWorkflowActionHandled, primaryAgency]);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Financial snapshot</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotCard
            label="Rent paid up to"
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
            label="Next disbursement"
            value={snapshot.nextDisbursementDateLabel}
            subtext={snapshot.nextDisbursementEstimateLabel}
          />
          <button
            type="button"
            onClick={onOpenFees}
            className={cn('text-left', !onOpenFees && 'pointer-events-none')}
          >
            <SnapshotCard
              label="Management fee"
              value={snapshot.managementFeeLabel}
              subtext={snapshot.managementFeeSubLabel}
            />
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="inline-flex rounded-full border bg-muted/20 px-3 py-1.5">
          <h3 className="text-sm font-semibold">Rent ledger</h3>
        </div>

        {visibleLedgerRows.length === 0 ? (
          <div className="v2-dashboard__card rounded-2xl border px-4 py-8 text-center">
            <p className="text-sm font-medium">No rent ledger entries yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Record a rent reconciliation from Actions to start the ledger for this property.
            </p>
            <button
              type="button"
              onClick={() => setRentReconOpen(true)}
              className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold"
            >
              Record reconciliation
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground text-left text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 font-semibold">Due date</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Paid date</th>
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
              View full ledger
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
        onOpenChange={setRentChasingOpen}
        propertyId={propertyId}
        properties={properties}
        mode="rent_chasing"
        onCreated={() => {
          setRentChasingOpen(false);
          void onRefresh?.();
        }}
      />

      <RentChasingArrearsDialog
        open={arrearsDialogOpen}
        onOpenChange={setArrearsDialogOpen}
        propertyId={propertyId}
        subtitle={snapshot.arrearsDaysLabel}
      />
    </div>
  );
}
