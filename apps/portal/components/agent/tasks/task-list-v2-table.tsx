'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  Gavel,
  Home,
  MoreVertical,
  Wrench,
} from 'lucide-react';

import type { TaskListV2Row } from '@/lib/task-list-v2';
import { cn } from '@/lib/utils';

function TaskIcon({ row }: { row: TaskListV2Row }) {
  const className = 'size-4';
  const wrapClass = cn(
    'flex size-9 shrink-0 items-center justify-center rounded-xl',
    row.category === 'maintenance' && 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    row.category === 'inspection' && 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
    row.category === 'leasing' && 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
    row.category === 'rent_review' && 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300',
    row.category === 'tribunal' && 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  );

  return (
    <span className={wrapClass}>
      {row.category === 'maintenance' ? (
        <Wrench className={className} />
      ) : row.category === 'inspection' ? (
        <Calendar className={className} />
      ) : row.category === 'tribunal' ? (
        <Gavel className={className} />
      ) : row.category === 'leasing' ? (
        <Home className={className} />
      ) : (
        <Briefcase className={className} />
      )}
    </span>
  );
}

function StatusBadge({
  label,
  sublabel,
  tone,
}: {
  label: string;
  sublabel?: string;
  tone: TaskListV2Row['statusTone'];
}) {
  return (
    <div className="min-w-0">
      <span
        className={cn(
          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
          tone === 'action' && 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
          tone === 'handling' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
          tone === 'waiting' && 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
          tone === 'completed' && 'bg-muted text-muted-foreground',
          tone === 'muted' && 'bg-muted text-muted-foreground',
        )}
      >
        {label}
      </span>
      {sublabel ? (
        <p className="text-muted-foreground mt-1 truncate text-[11px]">{sublabel}</p>
      ) : null}
    </div>
  );
}

export function TaskListV2Table({ rows }: { rows: TaskListV2Row[] }) {
  const router = useRouter();

  return (
    <div className="v2-frosted-surface min-w-0 overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col style={{ width: '24%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3">Task</th>
              <th className="px-3 py-3">Property</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Updated</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              return (
                <tr
                  key={row.id}
                  onClick={() => router.push(row.href)}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/20',
                    row.needsReview && 'bg-rose-500/[0.03]',
                  )}
                >
                  <td className="px-3 py-3 align-top">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <TaskIcon row={row} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.task.title}</p>
                        <p className="text-muted-foreground truncate text-xs">{row.task.subtext}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="truncate font-medium">{row.property.address}</p>
                    <p className="text-muted-foreground truncate text-xs">{row.property.suburb}</p>
                  </td>
                  <td className="px-3 py-3 align-top text-xs font-medium">{row.typeLabel}</td>
                  <td className="px-3 py-3 align-top">
                    <StatusBadge
                      label={row.statusLabel}
                      sublabel={row.statusSublabel}
                      tone={row.statusTone}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="text-xs font-medium tabular-nums">{row.updatedLabel}</p>
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <div className="inline-flex items-center gap-1">
                      {row.needsReview ? (
                        <Link
                          href={row.href}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                        >
                          Review
                        </Link>
                      ) : (
                        <Link
                          href={row.href}
                          onClick={(event) => event.stopPropagation()}
                          className="v2-frosted-surface inline-flex rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-muted/40"
                        >
                          View
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground rounded-lg p-1.5"
                        aria-label="Task options"
                      >
                        <MoreVertical className="size-4" />
                      </button>
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
