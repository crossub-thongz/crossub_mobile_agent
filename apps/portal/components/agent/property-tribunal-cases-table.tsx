'use client';

import { CalendarDays, ChevronRight } from 'lucide-react';

import {
  ModuleInteractiveTableRow,
  ModuleListTable,
  ModuleTableHead,
} from '@/components/agent/module-list-table';
import type { TribunalCase } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

function ArrearsCell({
  amount,
  daysOverdue,
}: {
  amount?: number | null;
  daysOverdue?: number | null;
}) {
  if (amount == null && daysOverdue == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="tabular-nums font-medium">
        {amount != null ? formatCurrency(amount) : '—'}
      </span>
      {daysOverdue != null ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-medium',
            daysOverdue > 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground',
          )}
        >
          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
          {daysOverdue} day{daysOverdue === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );
}

export function PropertyTribunalCasesTable({
  items,
  onItemClick,
}: {
  items: TribunalCase[];
  onItemClick?: (item: TribunalCase) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center">
        <p className="text-sm font-medium">No tribunal cases</p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs">
          NCAT / tribunal matters for this property will appear here.
        </p>
      </div>
    );
  }

  return (
    <ModuleListTable minWidth={1180}>
      <ModuleTableHead
        columns={[
          'Order Number',
          'Created Date',
          'Property Address',
          'Tenant',
          'Rent Arrears',
          'Bill Arrears',
          'Bond Arrears',
          '',
        ]}
      />
      <tbody className="divide-y">
        {items.map((item) => (
          <ModuleInteractiveTableRow
            key={item.id}
            onActivate={onItemClick ? () => onItemClick(item) : undefined}
          >
            <td className="whitespace-nowrap px-3 py-3 text-xs font-medium tabular-nums">
              {item.caseNumber ?? workflowCaseReferenceLabel(item.id, 'tribunal')}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
              {item.createdAt ? formatDate(item.createdAt) : '—'}
            </td>
            <td className="max-w-[14rem] px-3 py-3 text-sm font-medium">
              <span className="line-clamp-2">{item.propertyAddress || '—'}</span>
            </td>
            <td className="max-w-[10rem] px-3 py-3 text-sm">
              <span className="line-clamp-2">{item.tenantName || '—'}</span>
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-sm">
              <ArrearsCell
                amount={item.rentArrearsAmount}
                daysOverdue={item.rentArrearsDaysOverdue}
              />
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-sm">
              <ArrearsCell
                amount={item.billArrearsAmount}
                daysOverdue={item.billArrearsDaysOverdue}
              />
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-sm">
              <ArrearsCell
                amount={item.bondArrearsAmount}
                daysOverdue={item.bondArrearsDaysOverdue}
              />
            </td>
            <td className="px-3 py-3 text-right text-muted-foreground">
              <ChevronRight className="inline size-4" />
            </td>
          </ModuleInteractiveTableRow>
        ))}
      </tbody>
    </ModuleListTable>
  );
}
