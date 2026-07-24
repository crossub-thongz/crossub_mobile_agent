'use client';

import {
  ModuleListTable,
  ModuleMobileCardShell,
  ModuleTableChevronCell,
  ModuleTableHead,
  ModuleTableLinkCell,
  ModuleTableTruncateText,
} from '@/components/agent/module-list-table';
import { propertyDetail } from '@/constants/routes';
import { TERMINATION_UI } from '@/constants/end-leasing';
import {
  archiveOutcomeBadge,
  type ArchiveEndLeasingRow,
} from '@/lib/archive-case-display';
import type { ArchivedLeasingCycle, ArchivedRentReview } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export const WORKFLOW_CASE_DELETED_STATUS = 'DELETED';

function deletedStatusBadge() {
  return (
    <span className={TERMINATION_UI.deletedBadge}>{WORKFLOW_CASE_DELETED_STATUS}</span>
  );
}

export function ArchivedLeasingCyclesTable({ items }: { items: ArchivedLeasingCycle[] }) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {items.map((item) => {
          const href = propertyDetail(item.propertyId);
          return (
            <ModuleMobileCardShell key={item.id} href={href}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.propertyAddress}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {item.cancelReason}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {deletedStatusBadge()}
                <span className="font-medium tabular-nums">
                  {item.rentPerWeek != null ? `${formatCurrency(item.rentPerWeek)}/wk` : '—'}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatDateTime(item.cancelledAt)}
                </span>
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
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
                    <ModuleTableTruncateText lines={2}>{item.propertyAddress}</ModuleTableTruncateText>
                  </ModuleTableLinkCell>
                  <td className="px-3 py-3 text-xs">{deletedStatusBadge()}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {item.rentPerWeek != null ? `${formatCurrency(item.rentPerWeek)}/wk` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(item.cancelledAt)}
                  </td>
                  <td className="max-w-[18rem] px-3 py-3 text-xs leading-relaxed">
                    <ModuleTableTruncateText lines={2}>{item.cancelReason}</ModuleTableTruncateText>
                  </td>
                  <ModuleTableChevronCell href={href} />
                </tr>
              );
            })}
          </tbody>
        </ModuleListTable>
      </div>
    </>
  );
}

export function ArchivedEndLeasingTable({ items }: { items: ArchiveEndLeasingRow[] }) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {items.map((item) => {
          const href = item.propertyId ? propertyDetail(item.propertyId) : undefined;
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.propertyAddress}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{item.note}</p>
                </div>
                {href ? (
                  <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {archiveOutcomeBadge(item.outcome)}
                <span className="text-muted-foreground">
                  Vacate {item.vacateDate ? formatDate(item.vacateDate) : '—'}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {item.closedAt ? formatDateTime(item.closedAt) : '—'}
                </span>
              </div>
            </>
          );
          if (href) {
            return (
              <ModuleMobileCardShell key={item.id} href={href}>
                {body}
              </ModuleMobileCardShell>
            );
          }
          return (
            <div key={item.id} className="rounded-xl border bg-card p-3 shadow-sm">
              {body}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable minWidth={880}>
          <ModuleTableHead columns={['Property', 'Status', 'Vacate date', 'Closed', 'Notes', '']} />
          <tbody className="divide-y">
            {items.map((item) => {
              const href = item.propertyId ? propertyDetail(item.propertyId) : undefined;
              return (
                <tr key={item.id} className="align-top transition-colors hover:bg-muted/20">
                  {href ? (
                    <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                      <ModuleTableTruncateText lines={2}>{item.propertyAddress}</ModuleTableTruncateText>
                    </ModuleTableLinkCell>
                  ) : (
                    <td className="max-w-[14rem] px-3 py-3 font-medium">
                      <ModuleTableTruncateText lines={2}>{item.propertyAddress}</ModuleTableTruncateText>
                    </td>
                  )}
                  <td className="px-3 py-3 text-xs">{archiveOutcomeBadge(item.outcome)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                    {item.vacateDate ? formatDate(item.vacateDate) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                    {item.closedAt ? formatDateTime(item.closedAt) : '—'}
                  </td>
                  <td className="max-w-[18rem] px-3 py-3 text-xs leading-relaxed">
                    <ModuleTableTruncateText lines={2}>{item.note}</ModuleTableTruncateText>
                  </td>
                  {href ? <ModuleTableChevronCell href={href} /> : <td className="px-3 py-3" />}
                </tr>
              );
            })}
          </tbody>
        </ModuleListTable>
      </div>
    </>
  );
}

export function ArchivedRentReviewsTable({ items }: { items: ArchivedRentReview[] }) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {items.map((item) => {
          const href = item.propertyId ? propertyDetail(item.propertyId) : undefined;
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.propertyAddress}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {item.cancelReason}
                  </p>
                </div>
                {href ? (
                  <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {deletedStatusBadge()}
                <span className="font-medium tabular-nums">
                  {item.currentRent != null ? `${formatCurrency(item.currentRent)}/wk` : '—'}
                </span>
                <span className="text-muted-foreground">
                  Due {item.reviewDue ? formatDate(item.reviewDue) : '—'}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatDateTime(item.cancelledAt)}
                </span>
              </div>
            </>
          );
          if (href) {
            return (
              <ModuleMobileCardShell key={item.id} href={href}>
                {body}
              </ModuleMobileCardShell>
            );
          }
          return (
            <div key={item.id} className="rounded-xl border bg-card p-3 shadow-sm">
              {body}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable minWidth={920}>
          <ModuleTableHead
            columns={['Property', 'Status', 'Rent/wk', 'Due date', 'Deleted', 'Reason', '']}
          />
          <tbody className="divide-y">
            {items.map((item) => {
              const href = item.propertyId ? propertyDetail(item.propertyId) : undefined;
              return (
                <tr key={item.id} className="align-top transition-colors hover:bg-muted/20">
                  {href ? (
                    <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                      <ModuleTableTruncateText lines={2}>{item.propertyAddress}</ModuleTableTruncateText>
                    </ModuleTableLinkCell>
                  ) : (
                    <td className="max-w-[14rem] px-3 py-3 font-medium">
                      <ModuleTableTruncateText lines={2}>{item.propertyAddress}</ModuleTableTruncateText>
                    </td>
                  )}
                  <td className="px-3 py-3 text-xs">{deletedStatusBadge()}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {item.currentRent != null ? `${formatCurrency(item.currentRent)}/wk` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                    {item.reviewDue ? formatDate(item.reviewDue) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(item.cancelledAt)}
                  </td>
                  <td className="max-w-[18rem] px-3 py-3 text-xs leading-relaxed">
                    <ModuleTableTruncateText lines={2}>{item.cancelReason}</ModuleTableTruncateText>
                  </td>
                  {href ? <ModuleTableChevronCell href={href} /> : <td className="px-3 py-3" />}
                </tr>
              );
            })}
          </tbody>
        </ModuleListTable>
      </div>
    </>
  );
}
