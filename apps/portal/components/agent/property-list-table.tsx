'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, Bell, Pencil, Trash2 } from 'lucide-react';

import { ModuleTableTruncateText } from '@/components/agent/module-list-table';
import { SortableTableHeader } from '@/components/agent/sortable-table-header';
import { Button } from '@/components/ui/button';
import { messagesForProperty, needActionsForProperty } from '@/constants/routes';
import {
  applySortDirection,
  compareNumbers,
  compareSortTime,
  compareStrings,
  useClientTableSort,
} from '@/lib/client-table-sort';
import { crossubWebPropertyUrl } from '@/lib/crossub-web-url';
import { propertyCreatedAtIso } from '@/lib/record-created-at';
import type { Agency, Property } from '@/lib/types';
import { cn, formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';

function formatLeasePeriod(property: Property): string {
  if (!property.leaseStart && !property.leaseEnd) return '—';
  const start = property.leaseStart ? formatDate(property.leaseStart) : '—';
  const end = property.leaseEnd ? formatDate(property.leaseEnd) : '—';
  return `${start} – ${end}`;
}

function formatRent(property: Property): string {
  if (!property.rentWeekly || property.rentWeekly <= 0) return '—';
  return `${formatCurrency(property.rentWeekly)}/wk`;
}

function NotificationIconBadge({
  count,
  variant = 'message',
}: {
  count: number;
  variant?: 'message' | 'action';
}) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'pointer-events-none absolute -top-1 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-card',
        variant === 'message' ? 'bg-[#fa5151]' : 'bg-destructive',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function TableIconLink({
  href,
  label,
  title,
  active,
  activeClassName,
  children,
  badge,
}: {
  href: string;
  label: string;
  title: string;
  active?: boolean;
  activeClassName?: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative isolate flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-secondary/60',
        active ? activeClassName : 'text-muted-foreground hover:text-foreground',
      )}
      aria-label={label}
      title={title}
    >
      {children}
      {badge}
    </Link>
  );
}

function resolveAgencyName(property: Property, agencies: Agency[]): string {
  if (property.agencyName?.trim()) return property.agencyName.trim();
  const agency = agencies.find((a) => a.id === property.agencyId);
  return agency?.name ?? '—';
}

type PropertySortKey =
  | 'address'
  | 'tenant'
  | 'lease'
  | 'rent'
  | 'agency'
  | 'pm'
  | 'createdAt'
  | 'messages'
  | 'needActions'
  | 'endOfManagement';

export function PropertyListTable({
  properties,
  agencies,
  variant = 'active',
  messageUnreadFor,
  needActionCountFor,
  rowHref,
  onDelete,
  canManage,
}: {
  properties: Property[];
  agencies: Agency[];
  variant?: 'active' | 'archived';
  messageUnreadFor?: (propertyId: string) => number;
  needActionCountFor?: (propertyId: string) => number;
  rowHref: (property: Property) => string;
  onDelete: (property: Property) => void;
  canManage?: boolean;
}) {
  const isArchived = variant === 'archived';
  const { sortKey, sortDirection, onSort } = useClientTableSort<PropertySortKey>(
    isArchived ? 'endOfManagement' : 'createdAt',
    'desc',
  );

  const sorted = useMemo(() => {
    const rows = [...properties];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'address':
          cmp = compareStrings(formatPropertyFullAddress(a), formatPropertyFullAddress(b));
          break;
        case 'tenant':
          cmp = compareStrings(a.tenantName, b.tenantName);
          break;
        case 'lease':
          cmp = compareSortTime(a.leaseStart, b.leaseStart);
          break;
        case 'rent':
          cmp = compareNumbers(a.rentWeekly ?? 0, b.rentWeekly ?? 0);
          break;
        case 'agency':
          cmp = compareStrings(resolveAgencyName(a, agencies), resolveAgencyName(b, agencies));
          break;
        case 'pm':
          cmp = compareStrings(a.propertyManager ?? '', b.propertyManager ?? '');
          break;
        case 'createdAt':
          cmp = compareSortTime(propertyCreatedAtIso(a), propertyCreatedAtIso(b));
          break;
        case 'messages':
          cmp = compareNumbers(
            messageUnreadFor?.(a.id) ?? 0,
            messageUnreadFor?.(b.id) ?? 0,
          );
          break;
        case 'needActions':
          cmp = compareNumbers(
            needActionCountFor?.(a.id) ?? 0,
            needActionCountFor?.(b.id) ?? 0,
          );
          break;
        case 'endOfManagement':
          cmp = compareSortTime(a.endOfManagementDate, b.endOfManagementDate);
          break;
      }
      return applySortDirection(cmp, sortDirection);
    });
    return rows;
  }, [agencies, messageUnreadFor, needActionCountFor, properties, sortDirection, sortKey]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[21%]" />
          <col className="w-[11%]" />
          <col className="w-[13%]" />
          <col className="w-[8%]" />
          <col className="w-[11%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[5%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead>
          <tr className="border-b bg-muted/30">
            <SortableTableHeader
              label="Address"
              sortKey="address"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label="Tenant(s)"
              sortKey="tenant"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label="Lease"
              sortKey="lease"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label="Rent"
              sortKey="rent"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label="Agency"
              sortKey="agency"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label="PM"
              sortKey="pm"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label="Created"
              sortKey="createdAt"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            {isArchived ? (
              <SortableTableHeader
                label="Ended"
                sortKey="endOfManagement"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
            ) : (
              <SortableTableHeader
                label="Msgs"
                sortKey="messages"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                align="center"
              />
            )}
            <th className="px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-3 lg:py-3">
              {isArchived ? 'View' : 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
            {sorted.map((property) => {
              const messageUnread = messageUnreadFor?.(property.id) ?? 0;
              const needActionCount = needActionCountFor?.(property.id) ?? 0;
              const isDraft = property.registryIntakeComplete === false;
              const pmName = property.propertyManager?.trim();
              const pmHref =
                pmName && property.propertyManagerId
                  ? crossubWebPropertyUrl(property.id)
                  : null;
              const createdIso = propertyCreatedAtIso(property);

              return (
                <tr
                  key={property.id}
                  className={cn(
                    'transition-colors hover:bg-muted/20',
                    !isArchived && messageUnread > 0 && 'bg-primary/[0.03]',
                    isArchived && 'bg-muted/10',
                  )}
                >
                  <td className="px-2 py-2.5 lg:px-3 lg:py-3">
                    <Link
                      href={rowHref(property)}
                      className="font-medium leading-snug text-foreground hover:text-primary"
                    >
                      <ModuleTableTruncateText lines={2}>
                        {formatPropertyFullAddress(property)}
                      </ModuleTableTruncateText>
                    </Link>
                    {isDraft ? (
                      <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-900 dark:bg-red-950/50 dark:text-red-200">
                        <AlertCircle className="size-3 shrink-0" aria-hidden />
                        <span className="truncate">Incomplete</span>
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2.5 text-muted-foreground lg:px-3 lg:py-3">
                    <ModuleTableTruncateText lines={2}>{property.tenantName || '—'}</ModuleTableTruncateText>
                  </td>
                  <td className="px-2 py-2.5 text-xs leading-snug text-muted-foreground tabular-nums lg:px-3 lg:py-3">
                    <ModuleTableTruncateText lines={2}>{formatLeasePeriod(property)}</ModuleTableTruncateText>
                  </td>
                  <td className="px-2 py-2.5 text-xs font-medium tabular-nums lg:px-3 lg:py-3">
                    {formatRent(property)}
                  </td>
                  <td className="px-2 py-2.5 text-muted-foreground lg:px-3 lg:py-3">
                    <ModuleTableTruncateText lines={2}>
                      {resolveAgencyName(property, agencies)}
                    </ModuleTableTruncateText>
                  </td>
                  <td className="px-2 py-2.5 lg:px-3 lg:py-3">
                    {pmHref && pmName ? (
                      <a
                        href={pmHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs font-medium hover:underline"
                      >
                        <ModuleTableTruncateText lines={2}>{pmName}</ModuleTableTruncateText>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground tabular-nums lg:px-3 lg:py-3">
                    {createdIso && !Number.isNaN(new Date(createdIso).getTime())
                      ? formatDate(createdIso)
                      : '—'}
                  </td>
                  {isArchived ? (
                    <td className="px-2 py-2.5 text-xs text-muted-foreground tabular-nums lg:px-3 lg:py-3">
                      {property.endOfManagementDate
                        ? formatDate(property.endOfManagementDate)
                        : '—'}
                    </td>
                  ) : (
                    <td className="px-2 py-2.5 text-center align-middle lg:px-3 lg:py-3">
                      <TableIconLink
                        href={messagesForProperty(property.id)}
                        label={
                          messageUnread > 0
                            ? `${messageUnread} unread message${messageUnread === 1 ? '' : 's'} for this property`
                            : 'View messages for this property'
                        }
                        title="Messages"
                        active={messageUnread > 0}
                        activeClassName="text-primary"
                        badge={
                          <NotificationIconBadge count={messageUnread} variant="message" />
                        }
                      >
                        <Bell className="size-5" strokeWidth={2} />
                      </TableIconLink>
                    </td>
                  )}
                  <td className="px-2 py-2.5 lg:px-3 lg:py-3">
                    <div className="flex items-center justify-end gap-0.5 overflow-visible pr-1 pt-1">
                      {!isArchived ? (
                        <TableIconLink
                          href={needActionsForProperty(property.id)}
                          label={
                            needActionCount > 0
                              ? `${needActionCount} need action${needActionCount === 1 ? '' : 's'} for this property`
                              : 'View need actions for this property'
                          }
                          title="Need action"
                          active={needActionCount > 0}
                          activeClassName="text-destructive"
                          badge={
                            <NotificationIconBadge count={needActionCount} variant="action" />
                          }
                        >
                          <AlertTriangle className="size-4" strokeWidth={2} />
                        </TableIconLink>
                      ) : null}
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link
                          href={rowHref(property)}
                          aria-label={
                            isArchived
                              ? `View ${property.address}`
                              : `Edit ${property.address}`
                          }
                        >
                          <Pencil className="size-3.5" />
                        </Link>
                      </Button>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8"
                          onClick={() => onDelete(property)}
                          aria-label={`Delete ${property.address}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
