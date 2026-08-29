'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Briefcase,
  Calendar,
  ChevronRight,
  Gavel,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { maintenanceWorkflowProgress } from '@/lib/case-workflows';
import { leaseOccupancyLabel } from '@/lib/property-profile-v2-data';
import { isPropertyVacant } from '@/lib/property-leasing';
import { resolveCurrentRent, resolveLeaseDates } from '@/lib/property-overview';
import {
  findMaintenanceForTask,
  taskReferenceLabel,
  taskReportedLabel,
  type TaskListV2Row,
} from '@/lib/task-list-v2';
import { cn, formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';

import '@/components/agent/property-profile/property-profile-v2.css';
import '@/components/agent/tasks/task-list-v2.css';

function PreviewIcon({ row }: { row: TaskListV2Row }) {
  const className = 'size-5';
  const wrapClass = cn(
    'flex size-11 shrink-0 items-center justify-center rounded-xl',
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
      ) : (
        <Briefcase className={className} />
      )}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="min-w-0 text-right font-medium">{value}</span>
    </div>
  );
}

export function TaskListPreviewPanel({
  row,
  onClose,
}: {
  row: TaskListV2Row;
  onClose: () => void;
}) {
  const { maintenanceAll, leasingRecords } = useAgentData();
  const { property, task } = row;

  const currentLease = leasingRecords.find(
    (lease) => lease.propertyId === property.id && lease.status === 'current',
  );
  const maintenance = findMaintenanceForTask(task, maintenanceAll);
  const progress = maintenance ? maintenanceWorkflowProgress(maintenance) : null;
  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : []);
  const { start: leaseStart, end: leaseEnd } = resolveLeaseDates(property, currentLease);
  const rent = resolveCurrentRent(property, currentLease);

  const activity = useMemo(() => {
    if (!maintenance?.timeline?.length) return [];
    return maintenance.timeline.slice(0, 4).reverse();
  }, [maintenance?.timeline]);

  const reference = taskReferenceLabel(task.jobRow);
  const reported = taskReportedLabel(task);

  return (
    <aside className="task-list-v2__panel v2-dashboard__card hidden w-[22rem] shrink-0 flex-col overflow-hidden rounded-2xl border xl:flex xl:w-[26rem]">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <PreviewIcon row={row} />
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-snug">{task.title}</h2>
              <span
                className={cn(
                  'mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  row.statusTone === 'action'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    : row.statusTone === 'handling'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : row.statusTone === 'waiting'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-muted text-muted-foreground',
                )}
              >
                {row.statusLabel}
              </span>
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                {formatPropertyFullAddress(property)}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {row.typeLabel} • Reported {reported}
                {reference ? ` • Ref: ${reference}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-lg border p-1.5"
            aria-label="Close task preview"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <section className="space-y-4">
          <div
            className={cn(
              'rounded-2xl border p-4',
              row.needsReview
                ? 'border-rose-500/20 bg-rose-500/[0.04]'
                : 'bg-muted/20',
            )}
          >
            <p className="text-sm font-semibold">
              {task.jobRow?.status ?? row.statusLabel}
            </p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {task.detail ?? task.description}
            </p>
            {maintenance?.recommendation ? (
              <div className="mt-3 rounded-xl border bg-background/70 p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="text-primary mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">CROS recommendation</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {maintenance.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {progress ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Progress</h3>
              <div className="overflow-x-auto rounded-xl border bg-card p-3">
                <div className="flex min-w-[20rem] items-center gap-2">
                  {progress.steps.map((step, index) => {
                    const current = step.status === 'current';
                    const done = step.status === 'done';
                    return (
                      <div key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="min-w-0 text-center">
                          <div
                            className={cn(
                              'mx-auto flex size-7 items-center justify-center rounded-full text-[10px] font-semibold',
                              current
                                ? 'bg-rose-600 text-white'
                                : done
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {index + 1}
                          </div>
                          <p className="mt-1 truncate text-[10px] font-medium">{step.label}</p>
                        </div>
                        {index < progress.steps.length - 1 ? (
                          <div
                            className={cn(
                              'mb-4 h-0.5 flex-1',
                              done ? 'bg-primary/30' : 'bg-muted',
                            )}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Task details</h3>
              <div className="rounded-xl border bg-card p-3">
                <DetailRow label="Issue" value={task.description || '—'} />
                {maintenance ? (
                  <>
                    <DetailRow
                      label="Priority"
                      value={maintenance.priority ? maintenance.priority : 'Normal'}
                    />
                    <DetailRow
                      label="Responsibility"
                      value={
                        maintenance.responsibility
                          ? maintenance.responsibility.charAt(0).toUpperCase() +
                            maintenance.responsibility.slice(1)
                          : '—'
                      }
                    />
                    <DetailRow label="Category" value={maintenance.title || row.typeLabel} />
                  </>
                ) : (
                  <DetailRow label="Type" value={row.typeLabel} />
                )}
                <DetailRow label="Created" value={reported} />
                {task.jobRow?.date && task.jobRow.date !== '—' ? (
                  <DetailRow label="Due" value={task.jobRow.date} />
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Property</h3>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-sm font-semibold">{formatPropertyFullAddress(property)}</p>
                <span
                  className={cn(
                    'mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    isVacant
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                  )}
                >
                  {leaseOccupancyLabel(property, isVacant)}
                </span>
                <div className="mt-3 space-y-0">
                  <DetailRow
                    label="Tenant"
                    value={isVacant ? 'Vacant' : property.tenantName || '—'}
                  />
                  <DetailRow
                    label="Lease"
                    value={
                      leaseStart && leaseEnd
                        ? `${formatDate(leaseStart)} – ${formatDate(leaseEnd)}`
                        : '—'
                    }
                  />
                  <DetailRow
                    label="Rent"
                    value={
                      rent != null && rent > 0 ? `${formatCurrency(rent)} / week` : '—'
                    }
                  />
                </div>
                <Link
                  href={propertyDetail(property.id)}
                  className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  View property
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {activity.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Activity</h3>
              <ul className="space-y-2">
                {activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border bg-card px-3 py-2.5 text-sm"
                  >
                    <p className="font-medium">{entry.title}</p>
                    {entry.detail ? (
                      <p className="text-muted-foreground mt-0.5 text-xs">{entry.detail}</p>
                    ) : null}
                    <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                      {formatDate(entry.at)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <div className="border-t p-4">
        <Link
          href={row.href}
          className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
        >
          {row.needsReview ? 'Review task' : 'View task'}
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </aside>
  );
}
