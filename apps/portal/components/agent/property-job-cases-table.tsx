'use client';

import { Check, Trash2 } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';

import {
  ModuleInteractiveTableRow,
  ModuleListTable,
  ModuleSortableTableHead,
  type ModuleTableColumn,
} from '@/components/agent/module-list-table';
import { SortableTableHeader } from '@/components/agent/sortable-table-header';
import { RentReviewConductCountdownBadge } from '@/components/rent-review/rent-review-conduct-countdown-badge';
import { Button } from '@/components/ui/button';
import {
  applySortDirection,
  compareNumbers,
  compareStrings,
  useClientTableSort,
} from '@/lib/client-table-sort';
import type { PropertyJobPhase, PropertyJobRow, PropertyJobTypeFilterId } from '@/lib/property-job-rows';
import {
  availablePropertyJobTypeFilters,
  groupPropertyJobRows,
  matchesPropertyJobTypeFilter,
  splitPropertyJobRows,
} from '@/lib/property-job-rows';
import { cn } from '@/lib/utils';

type PropertyJobSortKey =
  | 'jobType'
  | 'name'
  | 'issueType'
  | 'description'
  | 'createdAt'
  | 'date'
  | 'status';

type PropertyJobRowCellKey =
  | 'jobType'
  | 'name'
  | 'issueType'
  | 'createdAt'
  | 'description'
  | 'status'
  | 'date'
  | 'countdown'
  | 'delete';

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
  showJobTypeFilter,
  showRentReviewSchedule: showRentReviewScheduleProp,
  requireJobTypeFilterSelection = false,
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
  /** Job-type dropdown in the table header (defaults on when grouped). */
  showJobTypeFilter?: boolean;
  /** Hide the table until a job type is chosen (property overview). */
  requireJobTypeFilterSelection?: boolean;
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
  const [jobTypeFilter, setJobTypeFilter] = useState<PropertyJobTypeFilterId | 'all' | ''>(() =>
    requireJobTypeFilterSelection ? '' : 'all',
  );
  const { sortKey, sortDirection, onSort } = useClientTableSort<PropertyJobSortKey>(
    'createdAt',
    'desc',
  );

  const jobTypeFilterEnabled = showJobTypeFilter ?? groupByJobType;

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

  useEffect(() => {
    setJobTypeFilter(requireJobTypeFilterSelection ? '' : 'all');
  }, [activeView, requireJobTypeFilterSelection]);

  const visibleRows = activeView === 'in_progress' ? inProgress : completed;
  const jobTypeFilterOptions = useMemo(
    () => availablePropertyJobTypeFilters(visibleRows),
    [visibleRows],
  );
  const filteredRows = useMemo(() => {
    if (jobTypeFilter === '') return [];
    if (!jobTypeFilterEnabled || jobTypeFilter === 'all') return visibleRows;
    return visibleRows.filter((row) => matchesPropertyJobTypeFilter(row, jobTypeFilter));
  }, [jobTypeFilter, jobTypeFilterEnabled, visibleRows]);
  const tableHidden = requireJobTypeFilterSelection && jobTypeFilter === '';
  const sortedRows = useMemo(
    () => sortPropertyJobRows(filteredRows, sortKey, sortDirection),
    [filteredRows, sortDirection, sortKey],
  );
  const rowGroups = useMemo(
    () =>
      groupByJobType
        ? groupPropertyJobRows(sortedRows, true, jobTypeFilter === 'all')
        : [{ label: '', rows: sortedRows }],
    [groupByJobType, jobTypeFilter, sortedRows],
  );
  const showGroupHeaders = groupByJobType && jobTypeFilter === 'all' && rowGroups.length > 0;
  const showRentReviewSchedule =
    showRentReviewScheduleProp ??
    visibleRows.some((row) => row.kind === 'rent_review' || row.rentReviewSchedule != null);
  const rentReviewLayout = showRentReviewScheduleProp === true;
  const showIssueType =
    !rentReviewLayout &&
    visibleRows.some((row) => row.kind === 'maintenance' || Boolean(row.issueType));
  const showDelete = Boolean(onDeleteRow && canDeleteRow);

  const rowCellOrder = useMemo((): PropertyJobRowCellKey[] => {
    if (rentReviewLayout) {
      return [
        'jobType',
        'name',
        'createdAt',
        'description',
        'status',
        'date',
        'countdown',
        ...(showDelete ? (['delete'] as const) : []),
      ];
    }
    return [
      'jobType',
      'name',
      ...(showIssueType ? (['issueType'] as const) : []),
      'description',
      'createdAt',
      ...(showKeyDateColumn ? (['date'] as const) : []),
      'status',
      ...(showRentReviewSchedule ? (['countdown'] as const) : []),
      ...(showDelete ? (['delete'] as const) : []),
    ];
  }, [
    rentReviewLayout,
    showDelete,
    showIssueType,
    showKeyDateColumn,
    showRentReviewSchedule,
  ]);

  const jobTypeSelect = (
    <select
      value={jobTypeFilter}
      onChange={(e) => setJobTypeFilter(e.target.value as PropertyJobTypeFilterId | 'all' | '')}
      aria-label="Filter by job type"
      className="border-input bg-background h-8 w-full min-w-[8.5rem] max-w-[11rem] rounded-md border px-2 text-[11px] font-semibold uppercase tracking-wide outline-none"
    >
      {requireJobTypeFilterSelection ? (
        <option value="">Select job type…</option>
      ) : null}
      <option value="all">All job types</option>
      {jobTypeFilterOptions.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const tableColumns: ModuleTableColumn<PropertyJobSortKey>[] = useMemo(() => {
    const sortable = (
      label: string,
      sortKey: PropertyJobSortKey,
      defaultDirection?: 'asc' | 'desc',
    ): ModuleTableColumn<PropertyJobSortKey> => ({
      kind: 'sortable',
      label,
      sortKey,
      ...(defaultDirection ? { defaultDirection } : {}),
    });

    if (rentReviewLayout) {
      return [
        sortable('Job type', 'jobType'),
        sortable('Order number', 'name'),
        sortable('Date created', 'createdAt', 'desc'),
        sortable('Description', 'description'),
        sortable('Status', 'status'),
        sortable(dateColumnLabel, 'date'),
        { kind: 'static', label: 'Countdown', align: 'right' },
        ...(showDelete ? [{ kind: 'static' as const, label: '' }] : []),
      ];
    }

    return [
      ...(jobTypeFilterEnabled
        ? [{ kind: 'static' as const, label: 'Job type' }]
        : [sortable('Job type', 'jobType')]),
      sortable('Name', 'name'),
      ...(showIssueType ? [sortable('Issue type', 'issueType')] : []),
      sortable('Description', 'description'),
      sortable('Date created', 'createdAt', 'desc'),
      ...(showKeyDateColumn ? [sortable(dateColumnLabel, 'date')] : []),
      sortable('Status', 'status'),
      ...(showRentReviewSchedule
        ? [{ kind: 'static' as const, label: 'Countdown', align: 'right' as const }]
        : []),
      ...(showDelete ? [{ kind: 'static' as const, label: '' }] : []),
    ];
  }, [
    dateColumnLabel,
    jobTypeFilterEnabled,
    rentReviewLayout,
    showDelete,
    showIssueType,
    showKeyDateColumn,
    showRentReviewSchedule,
  ]);
  const tableMinWidth =
    (rentReviewLayout ? 900 : 980) +
    (showIssueType ? 120 : 0) +
    (showKeyDateColumn || rentReviewLayout ? 100 : 0) +
    (showRentReviewSchedule ? 100 : 0) +
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

      {tableHidden ? (
        <div className="rounded-xl border border-dashed px-4 py-4">
          <label className="text-muted-foreground mb-2 block text-[11px] font-semibold uppercase tracking-wide">
            Job type
          </label>
          {jobTypeSelect}
          <p className="text-muted-foreground mt-2 text-xs">
            Select a job type to view jobs in progress.
          </p>
        </div>
      ) : visibleRows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {activeView === 'completed' ? 'No completed jobs on file yet.' : 'No jobs in progress.'}
        </p>
      ) : (
        <ModuleListTable minWidth={tableMinWidth}>
          {jobTypeFilterEnabled ? (
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-3 text-left">
                  {jobTypeSelect}
                </th>
                {tableColumns.slice(1).map((col) => {
                  if (col.kind === 'static') {
                    return (
                      <th
                        key={col.label || 'action'}
                        className={cn(
                          'px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                          col.align === 'right' ? 'text-right' : 'text-left',
                          col.label === '' && 'w-10',
                        )}
                      >
                        {col.label}
                      </th>
                    );
                  }
                  return (
                    <SortableTableHeader
                      key={col.sortKey}
                      label={col.label}
                      sortKey={col.sortKey}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={(key) => onSort(key, col.defaultDirection)}
                      align={col.align}
                    />
                  );
                })}
              </tr>
            </thead>
          ) : (
            <ModuleSortableTableHead
              columns={tableColumns}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          )}
          <tbody className="divide-y">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="text-muted-foreground px-3 py-8 text-center text-sm"
                >
                  No jobs match this job type.
                </td>
              </tr>
            ) : (
              rowGroups.map((group, groupIndex) => (
              <Fragment key={`${group.label || 'jobs'}-${groupIndex}`}>
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

                  const renderRowCell = (cell: PropertyJobRowCellKey) => {
                    switch (cell) {
                      case 'jobType':
                        return (
                          <td key={cell} className="px-3 py-3 text-xs">
                            <span
                              className={cn(
                                selected ? 'font-semibold text-primary' : 'text-muted-foreground',
                              )}
                            >
                              {row.jobType}
                            </span>
                          </td>
                        );
                      case 'name':
                        return (
                          <td key={cell} className="max-w-[10rem] px-3 py-3">
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
                        );
                      case 'issueType':
                        return (
                          <td key={cell} className="max-w-[9rem] px-3 py-3 text-xs">
                            <span
                              className={cn(
                                'line-clamp-2 font-medium',
                                selected ? 'text-foreground' : 'text-muted-foreground',
                              )}
                            >
                              {row.issueType ?? '—'}
                            </span>
                          </td>
                        );
                      case 'description':
                        return (
                          <td key={cell} className="max-w-[16rem] px-3 py-3 text-xs">
                            <span
                              className={cn(
                                'line-clamp-2',
                                selected ? 'text-foreground' : 'text-muted-foreground',
                              )}
                            >
                              {row.description}
                            </span>
                          </td>
                        );
                      case 'createdAt':
                        return (
                          <td
                            key={cell}
                            className={cn(
                              'whitespace-nowrap px-3 py-3 text-xs tabular-nums',
                              selected ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {row.createdAt}
                          </td>
                        );
                      case 'date':
                        return (
                          <td
                            key={cell}
                            className={cn(
                              'whitespace-nowrap px-3 py-3 text-xs tabular-nums',
                              selected ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {row.date}
                          </td>
                        );
                      case 'status':
                        return (
                          <td key={cell} className="px-3 py-3 text-xs">
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
                        );
                      case 'countdown':
                        return (
                          <td key={cell} className="px-3 py-3 text-right">
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
                        );
                      case 'delete':
                        return (
                          <td key={cell} className="px-2 py-3 text-right">
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
                        );
                    }
                  };

                  return (
                    <ModuleInteractiveTableRow
                      key={row.id}
                      onActivate={onRowClick ? () => onRowClick(row.id) : undefined}
                      selected={selected}
                      className={cn(
                        selected
                          ? 'bg-primary/12 shadow-[inset_3px_0_0_0_hsl(var(--primary))] ring-1 ring-inset ring-primary/25'
                          : undefined,
                        !selected && row.phase === 'in_progress' && 'bg-destructive/[0.02]',
                      )}
                    >
                      {rowCellOrder.map((cell) => renderRowCell(cell))}
                    </ModuleInteractiveTableRow>
                  );
                })}
              </Fragment>
            ))
            )}
          </tbody>
        </ModuleListTable>
      )}
    </div>
  );
}
