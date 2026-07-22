'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { InvoiceEditorDialog } from '@/components/accounting/invoice-editor-dialog';
import { CreateTribunalRentChasingDialog } from '@/components/agent/create-tribunal-rent-chasing-dialog';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { InfoPanel } from '@/components/agent/info-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import type { PropertyWorkflowActionId } from '@/lib/property-workflow-actions';
import { accountingJobRows } from '@/lib/property-job-rows';
import {
  buildPropertyAccountingSummary,
  hasPropertyAccountingData,
} from '@/lib/property-portal-accounting';
import type { PropertyPortalAccounting, PropertyPortalFinancial } from '@/lib/property-registry-api';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceItem,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function AccountingInfoGrid({
  items,
}: {
  items: { label: string; value?: string | number | null }[];
}) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-muted/20 px-3 py-2.5">
          <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm font-medium">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function RentLedgerTable({
  ledger,
}: {
  ledger: PropertyPortalAccounting['ledger'];
}) {
  if (ledger.length === 0) {
    return <p className="text-muted-foreground text-sm">No ledger entries on file.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-left text-[11px] uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Paid</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((row) => (
            <tr key={row.id} className="border-t border-border/50">
              <td className="px-3 py-2 tabular-nums">{row.dueDate}</td>
              <td className="px-3 py-2 tabular-nums">{row.paidDate ?? '—'}</td>
              <td className="px-3 py-2 font-medium tabular-nums">{formatCurrency(row.amount)}</td>
              <td className="text-muted-foreground px-3 py-2">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PropertyAccountingTab({
  property,
  propertyId,
  accounting: fallbackAccounting,
  financial,
  leasingCycles,
  rentReviews,
  vacatingCases,
  maintenance,
  inspections,
  tribunalCases,
  tenantSelections,
  currentLease,
  arrearsSectionRef,
  onRefresh,
}: {
  property: Property;
  propertyId: string;
  accounting?: import('@/lib/types').PropertyAccounting | null;
  financial?: PropertyPortalFinancial | null;
  arrearsSectionRef?: React.RefObject<HTMLElement | null>;
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceItem[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  tenantSelections: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  onRefresh?: () => void;
}) {
  const { apiConnected, primaryAgency, properties } = useAgentData();
  const router = useRouter();
  const { detail } = usePropertyPortalDetail(propertyId, apiConnected);
  const ledgerSectionRef = useRef<HTMLElement>(null);
  const localArrearsRef = useRef<HTMLElement>(null);
  const arrearsRef = arrearsSectionRef ?? localArrearsRef;

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [rentChasingOpen, setRentChasingOpen] = useState(false);

  const portalAccounting = detail?.accounting ?? null;
  const portalFinancial = detail?.financial ?? financial ?? null;

  const summary = useMemo(
    () =>
      buildPropertyAccountingSummary({
        propertyId,
        accounting: portalAccounting,
        financial: portalFinancial,
        fallback: fallbackAccounting,
      }),
    [propertyId, portalAccounting, portalFinancial, fallbackAccounting],
  );

  const hasData = hasPropertyAccountingData({
    accounting: portalAccounting,
    fallback: fallbackAccounting ?? undefined,
  });

  const outstandingDays =
    portalAccounting?.outstandingRentDays ?? fallbackAccounting?.daysInArrears ?? 0;
  const outstandingAmount =
    portalAccounting?.outstandingRentAmount ??
    portalFinancial?.outstandingRent ??
    fallbackAccounting?.rentOutstanding ??
    fallbackAccounting?.arrearsAmount ??
    0;
  const debtCollection =
    portalAccounting?.debtCollection ??
    fallbackAccounting?.collectionActivity.map((event) => ({
      id: event.id,
      channel: event.type,
      timestamp: event.at,
      summary: event.detail ? `${event.summary} — ${event.detail}` : event.summary,
    })) ??
    [];
  const statements =
    portalAccounting?.statements ??
    fallbackAccounting?.statements?.map((statement) => ({
      id: statement.id,
      month: statement.period,
      amount: statement.amount,
    })) ??
    [];
  const ledger =
    portalAccounting?.ledger ??
    fallbackAccounting?.rentIncomeHistory?.map((entry) => ({
      id: entry.id,
      dueDate: entry.dueDate,
      paidDate: entry.paidDate,
      amount: entry.amount,
      description: entry.description,
    })) ??
    [];

  const accountingCases = useMemo(
    () => accountingJobRows(fallbackAccounting),
    [fallbackAccounting],
  );

  const handleCustomAction = (actionId: PropertyWorkflowActionId) => {
    if (actionId === 'create_rent_reconciliation') {
      router.push(
        `${ROUTES.ACCOUNTING}?section=rent_reconciliation&propertyId=${encodeURIComponent(propertyId)}`,
      );
      return true;
    }
    if (actionId === 'open_invoice_management') {
      if (!primaryAgency) {
        toast.error('Complete your agency profile before creating invoices');
        return true;
      }
      setInvoiceOpen(true);
      return true;
    }
    if (actionId === 'open_rent_chasing') {
      setRentChasingOpen(true);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel
        tab="accounting"
        property={property}
        propertyId={propertyId}
        leasingCycles={leasingCycles}
        rentReviews={rentReviews}
        vacatingCases={vacatingCases}
        maintenance={maintenance}
        inspections={inspections}
        tribunalCases={tribunalCases}
        tenantSelections={tenantSelections}
        currentLease={currentLease}
        onCreated={() => void onRefresh?.()}
        onCustomAction={handleCustomAction}
        actionsOnly
      />

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

      <CreateTribunalRentChasingDialog
        open={rentChasingOpen}
        onOpenChange={setRentChasingOpen}
        propertyId={propertyId}
        properties={properties}
        onCreated={() => {
          setRentChasingOpen(false);
          void onRefresh?.();
          toast.success('Rent Chasing case created');
        }}
      />

      {!hasData ? (
        <p className="text-muted-foreground text-sm">
          No accounting data yet — use the actions above to reconcile rent, manage invoices, or
          open a Rent Chasing case.
        </p>
      ) : null}

      {accountingCases.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Accounting cases</h3>
          <PropertyJobCasesTable rows={accountingCases} showViewToggle={false} />
        </section>
      ) : null}

      <InfoPanel title="Accounting" icon={Wallet}>
        <p className="text-muted-foreground text-sm">
          Rent ledger, statements, and arrears for this property.
        </p>
        <div className="mt-3 rounded-xl border bg-card px-4 py-3">
          <p className="text-primary text-[10px] font-semibold uppercase tracking-wide">
            {summary.label}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{summary.currentStep}</p>
          {summary.detail ? (
            <p className="text-muted-foreground mt-1 text-xs">{summary.detail}</p>
          ) : null}
        </div>
      </InfoPanel>

      <section ref={ledgerSectionRef} id="rent-reconciliation" className="space-y-3 scroll-mt-24">
        <h3 className="text-sm font-semibold">Rent reconciliation</h3>
        <RentLedgerTable ledger={ledger} />
      </section>

      <section ref={arrearsRef} id="rent-arrears" className="space-y-3 scroll-mt-24">
        <h3 className="text-sm font-semibold">Arrears</h3>
        {portalAccounting?.outstandingRentDays != null || outstandingDays > 0 ? (
          <AccountingInfoGrid
            items={[
              { label: 'Outstanding amount', value: formatCurrency(outstandingAmount) },
              { label: 'Days outstanding', value: outstandingDays },
              {
                label: 'Tenant',
                value: fallbackAccounting?.tenantName,
              },
            ]}
          />
        ) : (
          <p className="text-muted-foreground text-sm">No rent arrears on file for this property.</p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Owner statements</h3>
        {statements.length === 0 ? (
          <p className="text-muted-foreground text-sm">No settlement statements on file.</p>
        ) : (
          <ul className="space-y-2">
            {statements.map((statement) => (
              <li
                key={statement.id}
                className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="font-medium">{statement.month}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatCurrency(statement.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Arrears reminders</h3>
        {debtCollection.length === 0 ? (
          <p className="text-muted-foreground text-sm">No arrears activity on file.</p>
        ) : (
          <ul className="space-y-2">
            {debtCollection.map((event) => (
              <li key={event.id} className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {event.channel}
                  </span>
                  <span className="text-muted-foreground text-[11px] tabular-nums">
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>
                <p className="mt-1">{event.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
