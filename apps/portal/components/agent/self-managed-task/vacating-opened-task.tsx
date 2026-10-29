'use client';

import type { ReactNode } from 'react';
import { Building2, Clock, FileText, type LucideIcon } from 'lucide-react';

import { AdminSideCard, TaskBreadcrumb, TaskStatusPill } from '@/components/agent/self-managed-task/admin-task-chrome';
import { END_LEASING_AGENT_STEP, END_LEASING_SELF_MANAGED_STEP_ORDER } from '@/lib/end-leasing/agent-workflow-model';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

const RAIL: { id: string; label: string }[] = [
  { id: END_LEASING_AGENT_STEP.VACATE_CONFIRMED, label: 'Vacate' },
  { id: END_LEASING_AGENT_STEP.OUTGOING_INSPECTION, label: 'Outgoing' },
  { id: END_LEASING_AGENT_STEP.REPORT_COMPARISON, label: 'Compare' },
  { id: END_LEASING_AGENT_STEP.COMPLETE, label: 'Complete' },
];

/**
 * Self-Manage vacating task: address, the four real steps, the next action, and the
 * tenancy facts. Bond and refund stay off this page until that work actually exists.
 */
export function VacatingOpenedTask({
  reference,
  assignedTo,
  address,
  locality,
  stageId,
  completed,
  nextAction,
  nextDetail,
  dueLabel,
  statusLabel,
  statusTone,
  facts,
  rows,
  actions,
  workflow,
}: {
  reference: string;
  assignedTo: string;
  address: string;
  locality: string;
  stageId: string;
  completed: boolean;
  nextAction: string;
  nextDetail: string;
  dueLabel: string | null;
  statusLabel: string;
  statusTone: 'active' | 'attention' | 'done' | 'danger';
  facts: readonly { icon: LucideIcon; label: string }[];
  rows: readonly { label: string; value: string }[];
  actions?: ReactNode;
  workflow: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4 lg:px-8">
        <TaskBreadcrumb href={ROUTES.VACATING} label="Vacating" segments={[reference]} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Assigned to</span>
            <span className="flex size-6 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-semibold text-violet-800 dark:text-violet-200">
              {assignedTo.slice(0, 1).toUpperCase()}
            </span>
            <span className="font-medium">{assignedTo}</span>
          </div>
          {actions}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 px-6 pt-3 pb-10 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <Building2 className="text-muted-foreground mt-1.5 size-5 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{address}</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">{locality}</p>
              {facts.length > 0 ? (
                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                  {facts.map((fact) => (
                    <span key={fact.label} className="inline-flex items-center gap-1.5 capitalize">
                      <fact.icon className="size-3.5" />
                      {fact.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4 xl:col-start-1">
          <VacatingStageRail stageId={stageId} completed={completed} />
          <section className="rounded-xl border border-violet-500/25 bg-violet-500/[0.04] p-4">
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-200">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold tracking-wider text-violet-700 uppercase dark:text-violet-300">
                    Next action
                  </p>
                  <TaskStatusPill label={statusLabel} tone={statusTone} />
                </div>
                <p className="mt-1 text-lg leading-snug font-semibold">{nextAction}</p>
                {nextDetail ? <p className="text-muted-foreground mt-1.5 text-[13px]">{nextDetail}</p> : null}
              </div>
              {dueLabel ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <Clock className="size-4" />
                  {dueLabel}
                </p>
              ) : null}
            </div>
          </section>
          {workflow}
        </div>

        <aside className="space-y-4 xl:col-start-2 xl:row-start-2">
          <AdminSideCard title="Tenancy">
            <dl className="space-y-2 text-sm">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-right font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </AdminSideCard>
        </aside>
      </div>
    </div>
  );
}

function VacatingStageRail({ stageId, completed }: { stageId: string; completed: boolean }) {
  const index = END_LEASING_SELF_MANAGED_STEP_ORDER.indexOf(
    stageId as (typeof END_LEASING_SELF_MANAGED_STEP_ORDER)[number],
  );
  return (
    <section className="bg-card rounded-xl border px-3 py-4 shadow-sm">
      <ol className="flex w-full" aria-label="Vacating progress">
        {RAIL.map((step, i) => {
          const done = completed || (index >= 0 && i < index);
          const current = !completed && index >= 0 && i === index;
          const nextDone = completed || (index >= 0 && i + 1 < index);
          const nextCurrent = !completed && index >= 0 && i + 1 === index;
          return (
            <li key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center">
              {i < RAIL.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-[8px] left-1/2 h-[2px] w-full',
                    nextDone ? 'bg-emerald-500' : 'bg-border',
                  )}
                  style={
                    nextCurrent
                      ? { backgroundImage: 'linear-gradient(to right, #10b981, #7c3aed)' }
                      : undefined
                  }
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10 size-[18px] rounded-full border-2 bg-card',
                  done && 'border-emerald-500 bg-emerald-500',
                  current && 'border-violet-500',
                  !done && !current && 'border-border',
                )}
              />
              <span
                className={cn(
                  'mt-2 px-1 text-center text-[11px] leading-tight font-medium',
                  done || current ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
