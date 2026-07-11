'use client';

import { Check, Trash2 } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import {
  ModuleListTable,
  ModuleSortableTableHead,
  type ModuleTableColumn,
} from '@/components/agent/module-list-table';
import { RentReviewConductCountdownBadge } from '@/components/rent-review/rent-review-conduct-countdown-badge';
import { Button } from '@/components/ui/button';
import {
  applySortDirection,
  compareNumbers,
  compareStrings,
  useClientTableSort,
} from '@/lib/client-table-sort';
import type { PropertyJobPhase, PropertyJobRow } from '@/lib/property-job-rows';
import { groupPropertyJobRows, splitPropertyJobRows } from '@/lib/property-job-rows';
import { cn } from '@/lib/utils';

type PropertyJobSortKey =
  | 'jobType'
  | 'name'
  | 'issueType'
  | 'description'
  | 'createdAt'
  | 'date'
  | 'status';

function sortPropertyJobRows(
  rows: PropertyJobRow[],
  sortKey: PropertyJobSortKey,
  sortDirection: 'asc' | 'desc',
): PropertyJobRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'jobType':
        cmp = compareStrings(a.jobType, b.jobType);
        break;
      case 'name':
        cmp = compareStrings(a.name, b.name);
        break;
      case 'issueType':
        cmp = compareStrings(a.issueType ?? '', b.issueType ?? '');
        break;
      case 'description':
        cmp = compareStrings(a.description, b.description);
        break;
      case 'createdAt':
        cmp = compareNumbers(a.createdAtMs, b.createdAtMs);
        break;
      case 'date':
        cmp = compareStrings(a.date, b.date);
        break;
      case 'status':
        cmp = compareStrings(a.status, b.status);
        break;
    }
    return applySortDirection(cmp, sortDirection);
  });
  return sorted;
}

export function PropertyJobCasesTable({
  rows,
  emptyTitle = 'No jobs',
  emptyDescription = 'Jobs for this property will appear here.',
  selectedId,
  onRowClick,
  defaultView = 'in_progress',
  showViewToggle = true,
  groupByJobType = false,
  showRentReviewSchedule: showRentReviewScheduleProp,
  dateColumnLabel = 'Key date',
  showKeyDateColumn = true,
  canDeleteRow,
  onDeleteRow,
}: {
  rows: PropertyJobRow[];
  emptyTitle?: string;
  emptyDescription?: string;
  selectedId?: string | null;
  onRowClick?: (id: string) => void;
  defaultView?: PropertyJobPhase;
  showViewToggle?: boolean;
  /** Group rows under job-type section headers (overview mixed jobs table). */
  groupByJobType?: boolean;
  /** Show rent-review countdown columns (Rent Review tab only). */
  showRentReviewSchedule?: boolean;
  /** Label for the contextual date column (due, scheduled, vacate, etc.). */
  dateColumnLabel?: string;
  /** Hide the contextual date column when it duplicates date created. */
  showKeyDateColumn?: boolean;
  canDeleteRow?: (row: PropertyJobRow) => boolean;
  onDeleteRow?: (row: PropertyJobRow) => void;
}) {
  const { inProgress, completed } = useMemo(() => splitPropertyJobRows(rows), [rows]);
  const [view, setView] = useState<PropertyJobPhase>(defaultView);
  const { sortKey, sortDirection, onSort } = useClientTableSort<PropertyJobSortKey>(
    'createdAt',
    'desc',
  );

  const hasInProgress = inProgress.length > 0;
  const hasCompleted = completed.length > 0;
  const activeView =
    view === 'in_progress' && hasInProgress
      ? 'in_progress'
      : view === 'completed' && hasCompleted
        ? 'completed'
        : hasInProgress
          ? 'in_progress'
          : 'completed';

  const visibleRows = activeView === 'in_progress' ? inProgress : completed;
  const sortedRows = useMemo(
    () => sortPropertyJobRows(visibleRows, sortKey, sortDirection),
    [visibleRows, sortDirection, sortKey],
  );
  const rowGroups = useMemo(
    () =>
      groupByJobType ? groupPropertyJobRows(sortedRows, true) : [{ label: '', rows: sortedRows }],
    [groupByJobType, sortedRows],
  );
  const showGroupHeaders = groupByJobType && rowGroups.length > 0;
  const showRentReviewSchedule =
    showRentReviewScheduleProp ??
    visibleRows.some((row) => row.kind === 'rent_review' || row.rentReviewSchedule != null);
  const showIssueType = visibleRows.some(
    (row) => row.kind === 'maintenance' || Boolean(row.issueType),
  );
  const showDelete = Boolean(onDeleteRow && canDeleteRow);

  const tableColumns: ModuleTableColumn<PropertyJobSortKey>[] = [
    { kind: 'sortable', label: 'Job type', sortKey: 'jobType' },
    { kind: 'sortable', label: 'Name', sortKey: 'name' },
    ...(showIssueType
      ? [{ kind: 'sortable' as const, label: 'Issue type', sortKey: 'issueType' as const }]
      : []),
    { kind: 'sortable', label: 'Description', sortKey: 'description' },
    { kind: 'sortable', label: 'Date created', sortKey: 'createdAt', defaultDirection: 'desc' },
    ...(showKeyDateColumn
      ? [{ kind: 'sortable' as const, label: dateColumnLabel, sortKey: 'date' as const }]
      : []),
    { kind: 'sortable', label: 'Status', sortKey: 'status' },
    ...(showRentReviewSchedule
      ? [
          { kind: 'static' as const, label: 'Countdown', align: 'right' as const },
          { kind: 'static' as const, label: 'Tenant reminder', align: 'right' as const },
        ]
      : []),
    ...(showDelete ? [{ kind: 'static' as const, label: '' }] : []),
  ];
  const tableMinWidth =
    980 +
    (showIssueType ? 120 : 0) +
    (showKeyDateColumn ? 100 : 0) +
    (showRentReviewSchedule ? 200 : 0) +
    (showDelete ? 40 : 0);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center">
        <p className="text-sm font-medium">{emptyTitle}</p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showViewToggle && (hasInProgress || hasCompleted) ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {activeView === 'completed'
              ? 'Completed jobs for this property, newest first.'
              : 'Jobs currently in progress on this property.'}
          </p>
          {hasInProgress && hasCompleted ? (
            <div className="inline-flex rounded-lg border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setView('in_progress')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  activeView === 'in_progress'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                In progress ({inProgress.length})
              </button>
              <button
                type="button"
                onClick={() => setView('completed')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  activeView === 'completed'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Completed ({completed.length})
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {visibleRows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {activeView === 'completed' ? 'No completed jobs on file yet.' : 'No jobs in progress.'}
        </p>
      ) : (
        <ModuleListTable minWidth={tableMinWidth}>
          <ModuleSortableTableHead
            columns={tableColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <tbody className="divide-y">
            {rowGroups.map((group) => (
              <Fragment key={group.label || 'jobs'}>
                {showGroupHeaders ? (
                  <tr className="bg-muted/40">
                    <td
                      colSpan={tableColumns.length}
                      className="text-muted-foreground px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em]"
                    >
                      {group.label}
                      <span className="text-muted-foreground/80 ml-2 font-semibold tabular-nums normal-case tracking-normal">
                        ({group.rows.length})
                      </span>
                    </td>
                  </tr>
                ) : null}
                {group.rows.map((row) => {
                  const selected = selectedId === row.id;
                  return (
                    <tr
                      key={row.id}
                      role={onRowClick ? 'button' : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      aria-selected={onRowClick ? selected : undefined}
                      className={cn(
                        'transition-all duration-200',
                        onRowClick && 'cursor-pointer',
                        selected
                          ? 'bg-primary/12 shadow-[inset_3px_0_0_0_hsl(var(--primary))] ring-1 ring-inset ring-primary/25'
                          : 'hover:bg-muted/30',
                        !selected && row.phase === 'in_progress' && 'bg-destructive/[0.02]',
                      )}
                      onClick={onRowClick ? () => onRowClick(row.id) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onRowClick(row.id);
                              }
                            }
                          : undefined
                      }
                    >
                      <td className="px-3 py-3 text-xs">
                        <span
                          className={cn(
                            selected ? 'font-semibold text-primary' : 'text-muted-foreground',
                          )}
                        >
                          {row.jobType}
                        </span>
                      </td>
                      <td className="max-w-[10rem] px-3 py-3">
                        <div className="flex items-center gap-2">
                          {selected ? (
                            <span
                              className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full"
                              aria-hidden
                            >
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              'leading-snug',
                              selected ? 'text-primary font-semibold' : 'font-medium',
                            )}
                          >
                            {row.name}
                          </span>
                        </div>
                      </td>
                      {showIssueType ? (
                        <td className="max-w-[9rem] px-3 py-3 text-xs">
                          <span
                            className={cn(
                              'line-clamp-2 font-medium',
                              selected ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {row.issueType ?? '—'}
                          </span>
                        </td>
                      ) : null}
                      <td className="max-w-[16rem] px-3 py-3 text-xs">
                        <span
                          className={cn(
                            'line-clamp-2',
                            selected ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {row.description}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-3 py-3 text-xs tabular-nums',
                          selected ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {row.createdAt}
                      </td>
                      {showKeyDateColumn ? (
                        <td
                          className={cn(
                            'whitespace-nowrap px-3 py-3 text-xs tabular-nums',
                            selected ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {row.date}
                        </td>
                      ) : null}
                      <td className="px-3 py-3 text-xs">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 font-semibold',
                            selected
                              ? 'bg-primary/15 text-primary'
                              : 'text-primary font-medium',
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      {showRentReviewSchedule ? (
                        <>
                          <td className="px-3 py-3 text-right">
                            {row.rentReviewSchedule ? (
                              <RentReviewConductCountdownBadge
                                label={row.rentReviewSchedule.orderCountdown.label}
                                title={row.rentReviewSchedule.orderCountdown.title}
                                tone={row.rentReviewSchedule.orderCountdown.tone}
                                compact
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {row.rentReviewSchedule ? (
                              <RentReviewConductCountdownBadge
                                label={row.rentReviewSchedule.tenantReminder.label}
                                title={row.rentReviewSchedule.tenantReminder.title}
                                tone={row.rentReviewSchedule.tenantReminder.tone}
                                compact
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </>
                      ) : null}
                      {showDelete ? (
                        <td className="px-2 py-3 text-right">
                          {canDeleteRow?.(row) ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive size-8"
                              aria-label={`Delete ${row.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRow?.(row);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </ModuleListTable>
      )}
    </div>
  );
}
