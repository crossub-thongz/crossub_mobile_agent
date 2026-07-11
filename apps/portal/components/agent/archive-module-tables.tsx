'use client';

import {
  ModuleListTable,
  ModuleTableChevronCell,
  ModuleTableHead,
  ModuleTableLinkCell,
} from '@/components/agent/module-list-table';
import { propertyDetail } from '@/constants/routes';
import { TERMINATION_UI } from '@/constants/end-leasing';
import type { ArchivedEndLeasingCase, ArchivedLeasingCycle } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export const WORKFLOW_CASE_DELETED_STATUS = 'DELETED';

function deletedStatusBadge() {
  return (
    <span className={TERMINATION_UI.deletedBadge}>{WORKFLOW_CASE_DELETED_STATUS}</span>
  );
}

export function ArchivedLeasingCyclesTable({ items }: { items: ArchivedLeasingCycle[] }) {
  return (
    <ModuleListTable minWidth={920}>
      <ModuleTableHead
        columns={['Property', 'Status', 'Rent/wk', 'Deleted', 'Reason', '']}
      />
      <tbody className="divide-y">
        {items.map((item) => {
          const href = propertyDetail(item.propertyId);
          return (
            <tr key={item.id} className="align-top transition-colors hover:bg-muted/20">
              <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                <span className="line-clamp-2">{item.propertyAddress}</span>
              </ModuleTableLinkCell>
              <td className="px-3 py-3 text-xs">{deletedStatusBadge()}</td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {item.rentPerWeek != null ? `${formatCurrency(item.rentPerWeek)}/wk` : '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                {formatDateTime(item.cancelledAt)}
              </td>
              <td className="max-w-[18rem] px-3 py-3 text-xs leading-relaxed whitespace-pre-wrap">
                {item.cancelReason}
              </td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

export function ArchivedEndLeasingTable({ items }: { items: ArchivedEndLeasingCase[] }) {
  return (
    <ModuleListTable minWidth={880}>
      <ModuleTableHead columns={['Property', 'Status', 'Vacate date', 'Deleted', 'Reason', '']} />
      <tbody className="divide-y">
        {items.map((item) => {
          const href = item.propertyId ? propertyDetail(item.propertyId) : undefined;
          return (
            <tr key={item.id} className="align-top transition-colors hover:bg-muted/20">
              {href ? (
                <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                  <span className="line-clamp-2">{item.propertyAddress}</span>
                </ModuleTableLinkCell>
              ) : (
                <td className="max-w-[14rem] px-3 py-3 font-medium">
                  <span className="line-clamp-2">{item.propertyAddress}</span>
                </td>
              )}
              <td className="px-3 py-3 text-xs">{deletedStatusBadge()}</td>
              <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                {item.vacateDate ? formatDate(item.vacateDate) : '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                {formatDateTime(item.cancelledAt)}
              </td>
              <td className="max-w-[18rem] px-3 py-3 text-xs leading-relaxed whitespace-pre-wrap">
                {item.cancelReason}
              </td>
              {href ? <ModuleTableChevronCell href={href} /> : <td className="px-3 py-3" />}
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}
