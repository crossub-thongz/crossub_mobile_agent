'use client';

import { useMemo } from 'react';
import { Wallet } from 'lucide-react';

import { InfoPanel } from '@/components/agent/info-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  buildPropertyAccountingSummary,
  hasPropertyAccountingData,
} from '@/lib/property-portal-accounting';
import type { PropertyPortalAccounting, PropertyPortalFinancial } from '@/lib/property-registry-api';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import type { Property, PropertyAccounting } from '@/lib/types';
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
  propertyId,
  accounting: fallbackAccounting,
  financial,
  arrearsSectionRef,
}: {
  propertyId: string;
  accounting?: PropertyAccounting | null;
  financial?: PropertyPortalFinancial | null;
  arrearsSectionRef?: React.RefObject<HTMLElement | null>;
}) {
  const { apiConnected } = useAgentData();
  const { detail } = usePropertyPortalDetail(propertyId, apiConnected);
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

  if (!hasData) {
    return (
      <p className="text-muted-foreground text-sm">
        No accounting data — ledger activity will appear here once available.
      </p>
    );
  }

  return (
    <div className="space-y-4">
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

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Rent ledger</h3>
        <RentLedgerTable ledger={ledger} />
      </section>

      {portalAccounting?.outstandingRentDays != null || outstandingDays > 0 ? (
        <section ref={arrearsSectionRef} id="rent-arrears" className="space-y-3">
          <h3 className="text-sm font-semibold">Rent arrears</h3>
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
        </section>
      ) : null}

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
