'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, ArchiveRestore, Bell, Pencil, Trash2 } from 'lucide-react';

import { HoverInfoList } from '@/components/agent/hover-info-list';
import {
  MODULE_TABLE_COLUMN_WIDTHS,
  ModuleTableTruncateText,
  moduleTableCellClassName,
} from '@/components/agent/module-list-table';
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
import {
  isPropertyServiceApproved,
  PROPERTY_APPROVAL_STATUS,
  PROPERTY_APPROVAL_STATUS_LABEL,
} from '@/constants/api-enums';
import { crossubWebPropertyUrl } from '@/lib/crossub-web-url';
import { propertyCreatedAtIso } from '@/lib/record-created-at';
import type { Agency, Property } from '@/lib/types';
import { cn, formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';
import { propertyListV2TenancyLabel } from '@/lib/property-list-v2';
import { usePropertyTenantContacts } from '@/lib/use-property-tenant-contacts';

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
        'pointer-events-none absolute top-0 right-0 z-10 flex h-4 min-w-4 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full px-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-card',
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
        'relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-secondary/60',
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
  onRestore,
  restoringId,
  canManage,
}: {
  properties: Property[];
  agencies: Agency[];
  variant?: 'active' | 'archived';
  messageUnreadFor?: (propertyId: string) => number;
  needActionCountFor?: (propertyId: string) => number;
  rowHref: (property: Property) => string;
  onDelete: (property: Property) => void;
  onRestore?: (property: Property) => void;
  restoringId?: string | null;
  canManage?: boolean;
}) {
  const isArchived = variant === 'archived';
  const tenantContactsByProperty = usePropertyTenantContacts(properties.map((property) => property.id));
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
    <div className="min-w-0 overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full min-w-[52rem] table-fixed border-collapse text-left text-sm">
        <colgroup>
          {(isArchived
            ? MODULE_TABLE_COLUMN_WIDTHS.propertyListArchived
            : MODULE_TABLE_COLUMN_WIDTHS.propertyList
          ).map((width, index) => (
            <col key={`${width}-${index}`} style={{ width }} />
          ))}
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
            {isArchived ? null : (
              <>
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
              </>
            )}
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
              const tenancy = propertyListV2TenancyLabel(
                property,
                undefined,
                tenantContactsByProperty[property.id],
              );

              return (
                <tr
                  key={property.id}
                  className={cn(
                    'transition-colors hover:bg-muted/20',
                    !isArchived && messageUnread > 0 && 'bg-primary/[0.03]',
                    isArchived && 'bg-muted/10',
                  )}
                >
                  <td className={moduleTableCellClassName()}>
                    <Link
                      href={rowHref(property)}
                      className="block min-w-0 font-medium leading-snug text-foreground hover:text-primary"
                    >
                      <ModuleTableTruncateText lines={1}>
                        {formatPropertyFullAddress(property)}
                      </ModuleTableTruncateText>
                    </Link>
                    {isDraft ? (
                      <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        <AlertCircle className="size-3 shrink-0" aria-hidden />
                        <span className="truncate">Draft</span>
                      </span>
                    ) : null}
                    {/* Only for a property CROSSUB has not accepted — an "Approved" chip on
                        every row would say nothing. A draft already reads "Draft"; it
                        has not been submitted for approval yet, so it gets no second chip. */}
                    {!isDraft && !isPropertyServiceApproved(property.approvalStatus) ? (
                      <span
                        className={
                          property.approvalStatus === PROPERTY_APPROVAL_STATUS.DECLINED
                            ? 'mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
                            : 'mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                        }
                      >
                        <span className="truncate">
                          {
                            PROPERTY_APPROVAL_STATUS_LABEL[
                              property.approvalStatus ?? PROPERTY_APPROVAL_STATUS.PENDING
                            ]
                          }
                        </span>
                      </span>
                    ) : null}
                  </td>
                  <td className={moduleTableCellClassName('text-muted-foreground')}>
                    <div className="flex min-w-0 items-start gap-1">
                      <ModuleTableTruncateText lines={1}>
                        {tenancy.primary || '—'}
                      </ModuleTableTruncateText>
                      <HoverInfoList
                        ariaLabel="Other tenants"
                        heading="Other tenants"
                        items={tenancy.others.map((name) => ({ title: name }))}
                      />
                    </div>
                  </td>
                  <td className={moduleTableCellClassName('text-xs leading-snug text-muted-foreground tabular-nums')}>
                    <ModuleTableTruncateText lines={1}>{formatLeasePeriod(property)}</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs font-medium tabular-nums')}>
                    <ModuleTableTruncateText lines={1}>{formatRent(property)}</ModuleTableTruncateText>
                  </td>
                  {isArchived ? null : (
                    <>
                      <td className={moduleTableCellClassName('text-muted-foreground')}>
                        <ModuleTableTruncateText lines={1}>
                          {resolveAgencyName(property, agencies)}
                        </ModuleTableTruncateText>
                      </td>
                      <td className={moduleTableCellClassName()}>
                        {pmHref && pmName ? (
                          <a
                            href={pmHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary block min-w-0 text-xs font-medium hover:underline"
                          >
                            <ModuleTableTruncateText lines={1}>{pmName}</ModuleTableTruncateText>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </>
                  )}
                  <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums whitespace-nowrap')}>
                    {createdIso && !Number.isNaN(new Date(createdIso).getTime())
                      ? formatDate(createdIso)
                      : '—'}
                  </td>
                  {isArchived ? (
                    <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums whitespace-nowrap')}>
                      {property.endOfManagementDate
                        ? formatDate(property.endOfManagementDate)
                        : '—'}
                    </td>
                  ) : (
                    <td className={moduleTableCellClassName('align-middle')}>
                      <div className="mx-auto flex w-fit items-center justify-center gap-1">
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
                          <Bell className="size-4" strokeWidth={2} />
                        </TableIconLink>
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
                      </div>
                    </td>
                  )}
                  <td className={moduleTableCellClassName()}>
                    <div className="flex items-center justify-end gap-0.5">
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
                      {onRestore ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2"
                          disabled={restoringId === property.id}
                          data-tour="history-restore"
                          onClick={() => onRestore(property)}
                          aria-label={`Restore ${property.address}`}
                          title="Restore property"
                        >
                          <ArchiveRestore className="size-3.5" />
                          {restoringId === property.id ? 'Restoring…' : 'Restore'}
                        </Button>
                      ) : null}
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8"
                          onClick={() => onDelete(property)}
                          aria-label={`Remove ${property.address}`}
                          title="Remove property"
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
