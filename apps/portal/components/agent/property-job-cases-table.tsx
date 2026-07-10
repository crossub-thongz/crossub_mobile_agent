'use client';

import { useMemo, useState } from 'react';

import { ModuleListTable, ModuleTableHead } from '@/components/agent/module-list-table';
import type { PropertyJobPhase, PropertyJobRow } from '@/lib/property-job-rows';
import { splitPropertyJobRows } from '@/lib/property-job-rows';
import { cn } from '@/lib/utils';

export function PropertyJobCasesTable({
  rows,
  emptyTitle = 'No jobs',
  emptyDescription = 'Jobs for this property will appear here.',
  selectedId,
  onRowClick,
  defaultView = 'in_progress',
  showViewToggle = true,
}: {
  rows: PropertyJobRow[];
  emptyTitle?: string;
  emptyDescription?: string;
  selectedId?: string | null;
  onRowClick?: (id: string) => void;
  defaultView?: PropertyJobPhase;
  showViewToggle?: boolean;
}) {
  const { inProgress, completed } = useMemo(() => splitPropertyJobRows(rows), [rows]);
  const [view, setView] = useState<PropertyJobPhase>(defaultView);

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
        <ModuleListTable minWidth={880}>
          <ModuleTableHead columns={['Job type', 'Name', 'Description', 'Date', 'Status']} />
          <tbody className="divide-y">
            {visibleRows.map((row) => {
              const selected = selectedId === row.id;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors hover:bg-muted/20',
                    selected && 'bg-primary/5',
                    onRowClick && 'cursor-pointer',
                    row.phase === 'in_progress' && !selected && 'bg-destructive/[0.02]',
                  )}
                  onClick={onRowClick ? () => onRowClick(row.id) : undefined}
                >
                  <td className="px-3 py-3 text-xs text-muted-foreground">{row.jobType}</td>
                  <td className="max-w-[10rem] px-3 py-3">
                    <span className="font-medium leading-snug">{row.name}</span>
                  </td>
                  <td className="max-w-[16rem] px-3 py-3 text-xs text-muted-foreground">
                    <span className="line-clamp-2">{row.description}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                    {row.date}
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-primary">{row.status}</td>
                </tr>
              );
            })}
          </tbody>
        </ModuleListTable>
      )}
    </div>
  );
}
