'use client';

import { ChevronRight } from 'lucide-react';

import {
  ModuleInteractiveTableRow,
  ModuleListTable,
  ModuleTableChevronCell,
  ModuleTableLinkCell,
} from '@/components/agent/module-list-table';
import { propertyDetail } from '@/constants/routes';
import type { PropertyAccounting } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

function outstandingBillTotal(item: PropertyAccounting): number {
  return (
    item.bills?.filter((b) => b.status === 'outstanding').reduce((sum, b) => sum + b.amount, 0) ??
    0
  );
}

function propertyAccountingHref(propertyId: string, hash?: string): string {
  const base = `${propertyDetail(propertyId)}?tab=Accounting`;
  return hash ? `${base}#${hash}` : base;
}

export function RentReconciliationListTable({
  items,
  onItemClick,
  selectedId,
}: {
  items: PropertyAccounting[];
  onItemClick?: (item: PropertyAccounting) => void;
  selectedId?: string | null;
}) {
  return (
    <ModuleListTable minWidth={920}>
      <thead>
        <tr className="border-b bg-muted/40 text-muted-foreground text-left text-[11px] uppercase tracking-wide">
          <th className="px-3 py-2.5 font-medium">Property</th>
          <th className="px-3 py-2.5 font-medium">Tenant</th>
          <th className="px-3 py-2.5 font-medium">Paid YTD</th>
          <th className="px-3 py-2.5 font-medium">Outstanding</th>
          <th className="px-3 py-2.5 font-medium">Balance</th>
          <th className="px-3 py-2.5 font-medium" aria-hidden />
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((item) => {
          const href = propertyAccountingHref(item.propertyId);
          const interactive = Boolean(onItemClick);
          const rowId = `recon-${item.propertyId}`;
          const openItem = onItemClick ? () => onItemClick(item) : undefined;
          return (
            <ModuleInteractiveTableRow
              key={item.propertyId}
              onActivate={openItem}
              selected={selectedId === rowId}
            >
              {interactive ? (
                <td className="max-w-[14rem] px-3 py-3 font-medium">
                  <span className="line-clamp-2">{item.propertyAddress}</span>
                </td>
              ) : (
                <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                  <span className="line-clamp-2">{item.propertyAddress}</span>
                </ModuleTableLinkCell>
              )}
              <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                <span className="line-clamp-2">{item.tenantName}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatCurrency(item.rentPaidYtd)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatCurrency(item.rentOutstanding)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatCurrency(item.currentBalance)}
              </td>
              {interactive ? (
                <td className="px-3 py-3 text-right text-muted-foreground">
                  <ChevronRight className="inline size-4" />
                </td>
              ) : (
                <ModuleTableChevronCell href={href} />
              )}
            </ModuleInteractiveTableRow>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

export function ArrearsListTable({
  items,
  onItemClick,
  selectedId,
}: {
  items: PropertyAccounting[];
  onItemClick?: (item: PropertyAccounting) => void;
  selectedId?: string | null;
}) {
  return (
    <ModuleListTable minWidth={980}>
      <thead>
        <tr className="border-b bg-muted/40 text-muted-foreground text-left text-[11px] uppercase tracking-wide">
          <th className="px-3 py-2.5 font-medium">Property</th>
          <th className="px-3 py-2.5 font-medium">Tenant</th>
          <th className="px-3 py-2.5 font-medium">Rent arrears</th>
          <th className="px-3 py-2.5 font-medium">Invoice arrears</th>
          <th className="px-3 py-2.5 font-medium">Days</th>
          <th className="px-3 py-2.5 font-medium" aria-hidden />
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((item) => {
          const billArrears = outstandingBillTotal(item);
          const href = propertyAccountingHref(item.propertyId, 'rent-arrears');
          const interactive = Boolean(onItemClick);
          const rowId = `arrears-${item.propertyId}`;
          const openItem = onItemClick ? () => onItemClick(item) : undefined;
          return (
            <ModuleInteractiveTableRow
              key={item.propertyId}
              onActivate={openItem}
              selected={selectedId === rowId}
              className="bg-destructive/[0.03]"
            >
              {interactive ? (
                <td className="max-w-[14rem] px-3 py-3 font-medium">
                  <span className="line-clamp-2">{item.propertyAddress}</span>
                </td>
              ) : (
                <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                  <span className="line-clamp-2">{item.propertyAddress}</span>
                </ModuleTableLinkCell>
              )}
              <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                <span className="line-clamp-2">{item.tenantName}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums text-destructive">
                {item.arrearsAmount > 0 ? formatCurrency(item.arrearsAmount) : '—'}
              </td>
              <td
                className={cn(
                  'whitespace-nowrap px-3 py-3 tabular-nums',
                  billArrears > 0 ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {billArrears > 0 ? formatCurrency(billArrears) : '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {item.daysInArrears > 0 ? `${item.daysInArrears}d` : '—'}
              </td>
              {interactive ? (
                <td className="px-3 py-3 text-right text-muted-foreground">
                  <ChevronRight className="inline size-4" />
                </td>
              ) : (
                <ModuleTableChevronCell href={href} />
              )}
            </ModuleInteractiveTableRow>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

export function StatementsListTable({ items }: { items: PropertyAccounting[] }) {
  return (
    <ModuleListTable minWidth={760}>
      <thead>
        <tr className="border-b bg-muted/40 text-muted-foreground text-left text-[11px] uppercase tracking-wide">
          <th className="px-3 py-2.5 font-medium">Property</th>
          <th className="px-3 py-2.5 font-medium">Tenant</th>
          <th className="px-3 py-2.5 font-medium">Statements</th>
          <th className="px-3 py-2.5 font-medium">Latest period</th>
          <th className="px-3 py-2.5 font-medium" aria-hidden />
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((item) => {
          const statements = item.statements ?? [];
          const latest = statements[0];
          const href = propertyAccountingHref(item.propertyId);
          return (
            <ModuleInteractiveTableRow key={item.propertyId}>
              <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                <span className="line-clamp-2">{item.propertyAddress}</span>
              </ModuleTableLinkCell>
              <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                <span className="line-clamp-2">{item.tenantName}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {statements.length > 0 ? statements.length : '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                {latest ? (
                  <span>
                    {latest.period}
                    <span className="text-muted-foreground ml-2 tabular-nums">
                      {formatCurrency(latest.amount)}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">None on file</span>
                )}
              </td>
              <ModuleTableChevronCell href={href} />
            </ModuleInteractiveTableRow>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

export function sumOutstandingBills(items: PropertyAccounting[]): number {
  return items.reduce((sum, item) => sum + outstandingBillTotal(item), 0);
}

export function filterArrearsItems(items: PropertyAccounting[]): PropertyAccounting[] {
  return items.filter((item) => item.arrearsAmount > 0 || outstandingBillTotal(item) > 0);
}
