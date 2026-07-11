'use client';

import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ModuleListTable, ModuleTableHead } from '@/components/agent/module-list-table';
import { RentReviewConductCountdownBadge } from '@/components/rent-review/rent-review-conduct-countdown-badge';
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
  const showConductCountdown = visibleRows.some((row) => row.conductCountdown != null);

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
        <ModuleListTable minWidth={showConductCountdown ? 980 : 880}>
          <ModuleTableHead
            columns={
              showConductCountdown
                ? ['Job type', 'Name', 'Description', 'Date', 'Status', 'Countdown']
                : ['Job type', 'Name', 'Description', 'Date', 'Status']
            }
          />
          <tbody className="divide-y">
            {visibleRows.map((row) => {
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
                    {row.date}
                  </td>
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
                  {showConductCountdown ? (
                    <td className="px-3 py-3 text-right">
                      {row.conductCountdown ? (
                        <RentReviewConductCountdownBadge
                          label={row.conductCountdown.label}
                          title={row.conductCountdown.title}
                          tone={row.conductCountdown.tone}
                          compact
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </ModuleListTable>
      )}
    </div>
  );
}
