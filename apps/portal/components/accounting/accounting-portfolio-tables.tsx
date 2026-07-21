'use client';

import {
  ModuleInteractiveTableRow,
  ModuleListTable,
  ModuleMobileCardShell,
  ModuleTableChevronCell,
  ModuleTableLinkCell,
} from '@/components/agent/module-list-table';
import { propertyDetail } from '@/constants/routes';
import { accountingPortfolioJobId } from '@/lib/portfolio-case-dialog';
import type { PropertyAccounting } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

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
    <>
      <div className="space-y-2 md:hidden">
        {items.map((item) => {
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(item) : undefined;
          const rowId = accountingPortfolioJobId(item);
          return (
            <ModuleMobileCardShell
              key={item.propertyId}
              onClick={openItem}
              href={interactive ? undefined : propertyAccountingHref(item.propertyId)}
              selected={selectedId === rowId}
              highlight={item.arrearsAmount > 0}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.propertyAddress}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{item.tenantName}</p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="text-muted-foreground">Paid {formatCurrency(item.rentPaidYtd)}</span>
                <span className="font-medium tabular-nums">Bal {formatCurrency(item.currentBalance)}</span>
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
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
              const rowId = accountingPortfolioJobId(item);
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
      </div>
    </>
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
    <>
      <div className="space-y-2 md:hidden">
        {items.map((item) => {
          const billArrears = outstandingBillTotal(item);
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(item) : undefined;
          const rowId = accountingPortfolioJobId(item);
          return (
            <ModuleMobileCardShell
              key={item.propertyId}
              onClick={openItem}
              href={interactive ? undefined : propertyAccountingHref(item.propertyId, 'rent-arrears')}
              selected={selectedId === rowId}
              highlight
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.propertyAddress}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{item.tenantName}</p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {item.arrearsAmount > 0 ? (
                  <span className="text-destructive font-medium tabular-nums">
                    Rent {formatCurrency(item.arrearsAmount)} · {item.daysInArrears}d
                  </span>
                ) : null}
                {billArrears > 0 ? (
                  <span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">
                    Invoices {formatCurrency(billArrears)}
                  </span>
                ) : null}
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
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
              const rowId = accountingPortfolioJobId(item);
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
      </div>
    </>
  );
}

export function StatementsListTable({
  items,
  onItemClick,
  selectedId,
}: {
  items: PropertyAccounting[];
  onItemClick?: (item: PropertyAccounting) => void;
  selectedId?: string | null;
}) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {items.map((item) => {
          const statements = item.statements ?? [];
          const latest = statements[0];
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(item) : undefined;
          const rowId = accountingPortfolioJobId(item);
          return (
            <ModuleMobileCardShell
              key={item.propertyId}
              onClick={openItem}
              href={interactive ? undefined : propertyAccountingHref(item.propertyId)}
              selected={selectedId === rowId}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.propertyAddress}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{item.tenantName}</p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="text-muted-foreground">
                  {statements.length > 0 ? `${statements.length} statements` : 'No statements'}
                </span>
                {latest ? (
                  <span className="font-medium tabular-nums">
                    {latest.period} · {formatCurrency(latest.amount)}
                  </span>
                ) : null}
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
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
              const interactive = Boolean(onItemClick);
              const rowId = accountingPortfolioJobId(item);
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
      </div>
    </>
  );
}

export function sumOutstandingBills(items: PropertyAccounting[]): number {
  return items.reduce((sum, item) => sum + outstandingBillTotal(item), 0);
}

export function filterArrearsItems(items: PropertyAccounting[]): PropertyAccounting[] {
  return items.filter((item) => item.arrearsAmount > 0 || outstandingBillTotal(item) > 0);
}
