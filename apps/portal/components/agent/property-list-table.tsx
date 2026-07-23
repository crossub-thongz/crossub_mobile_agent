'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AlertCircle, Pencil, Trash2 } from 'lucide-react';

import { SortableTableHeader } from '@/components/agent/sortable-table-header';
import { MessageUnreadBadge } from '@/components/agent/message-unread-badge';
import { Button } from '@/components/ui/button';
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
import { cn, formatCurrency, formatDate, formatDateTime, formatPropertyFullAddress } from '@/lib/utils';

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
  | 'endOfManagement';

export function PropertyListTable({
  properties,
  agencies,
  variant = 'active',
  messageUnreadFor,
  rowHref,
  onDelete,
  canManage,
}: {
  properties: Property[];
  agencies: Agency[];
  variant?: 'active' | 'archived';
  messageUnreadFor?: (propertyId: string) => number;
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
        case 'endOfManagement':
          cmp = compareSortTime(a.endOfManagementDate, b.endOfManagementDate);
          break;
      }
      return applySortDirection(cmp, sortDirection);
    });
    return rows;
  }, [agencies, messageUnreadFor, properties, sortDirection, sortKey]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <SortableTableHeader
                label="Property address"
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
                label="Lease period"
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
                label="Date created"
                sortKey="createdAt"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              {isArchived ? (
                <SortableTableHeader
                  label="End of management"
                  sortKey="endOfManagement"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                />
              ) : (
                <SortableTableHeader
                  label="Messages"
                  sortKey="messages"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                  align="center"
                />
              )}
              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {isArchived ? 'View' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((property) => {
              const messageUnread = messageUnreadFor?.(property.id) ?? 0;
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
                  <td className="max-w-[16rem] px-3 py-3">
                    <Link
                      href={rowHref(property)}
                      className="font-medium leading-snug text-foreground hover:text-primary"
                    >
                      <span className="line-clamp-2">{formatPropertyFullAddress(property)}</span>
                    </Link>
                    {isDraft ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-900 dark:bg-red-950/50 dark:text-red-200">
                        <AlertCircle className="size-3 shrink-0" aria-hidden />
                        Incomplete — finish setup
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                    <span className="line-clamp-2">{property.tenantName || '—'}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                    {formatLeasePeriod(property)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums">
                    {formatRent(property)}
                  </td>
                  <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                    <span className="line-clamp-2">{resolveAgencyName(property, agencies)}</span>
                  </td>
                  <td className="max-w-[9rem] px-3 py-3">
                    {pmHref && pmName ? (
                      <a
                        href={pmHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary line-clamp-2 text-xs font-medium hover:underline"
                      >
                        {pmName}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                    {createdIso && !Number.isNaN(new Date(createdIso).getTime())
                      ? formatDateTime(createdIso)
                      : '—'}
                  </td>
                  {isArchived ? (
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                      {property.endOfManagementDate
                        ? formatDate(property.endOfManagementDate)
                        : '—'}
                    </td>
                  ) : (
                    <td className="px-3 py-3 text-center">
                      <MessageUnreadBadge count={messageUnread} size="md" />
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
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
    </div>
  );
}
