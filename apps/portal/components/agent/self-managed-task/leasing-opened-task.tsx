'use client';

import type { ReactNode } from 'react';
import { Building2, Clock, FileText } from 'lucide-react';

import {
  AdminSideCard,
  TaskBreadcrumb,
  TaskStatusPill,
} from '@/components/agent/self-managed-task/admin-task-chrome';
import { LEASING_MAIN_STATUS } from '@/constants/leasing-relet-decision';
import { ROUTES } from '@/constants/routes';
import { leasingCycleLane } from '@/lib/module-workspace-lanes';
import type { LeasingCycle } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Self-Manage letting, laid out like the admin leasing task: address, stage rail, next
 * action, then the letting workspace with the case summary beside it.
 */
export function LeasingOpenedTask({
  cycle,
  address,
  locality,
  reference,
  assignedTo,
  nextAction,
  nextDetail,
  dueLabel,
  landlordName,
  tenantName,
  summary,
  workflow,
}: {
  cycle: LeasingCycle;
  address: string;
  locality: string;
  reference: string;
  assignedTo: string;
  nextAction: string;
  nextDetail: string;
  dueLabel: string | null;
  landlordName: string;
  tenantName: string;
  summary: ReactNode;
  workflow: ReactNode;
}) {
  const current = leasingCycleLane(cycle);
  const ended = current === 'completed' || current === 'cancelled';

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4 lg:px-8">
        <TaskBreadcrumb href={ROUTES.LEASING} label="Leasing" segments={[reference]} />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Assigned to</span>
          <span className="flex size-6 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-semibold text-violet-800 dark:text-violet-200">
            {assignedTo.slice(0, 1).toUpperCase()}
          </span>
          <span className="font-medium">{assignedTo}</span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 px-6 pt-3 pb-10 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <Building2 className="text-muted-foreground mt-1.5 size-5 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{address}</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {[locality, reference].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4 xl:col-start-1">
          <LeasingStageRail status={cycle.mainStatus} />

          <section
            className={cn(
              'rounded-xl border p-4',
              ended ? 'bg-card' : 'border-violet-500/25 bg-violet-500/[0.04]',
            )}
          >
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-200">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold tracking-wider text-violet-700 uppercase dark:text-violet-300">
                    Next action
                  </p>
                  <TaskStatusPill label={ended ? 'Closed' : 'In progress'} tone={ended ? 'done' : 'active'} />
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
          <AdminSideCard title="People">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Landlord</dt>
                <dd className="text-right font-medium">{landlordName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tenant</dt>
                <dd className="text-right font-medium">{tenantName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Agent</dt>
                <dd className="text-right font-medium">{assignedTo}</dd>
              </div>
            </dl>
          </AdminSideCard>
          {summary}
        </aside>
      </div>
    </div>
  );
}

const RAIL: { id: string; label: string }[] = [
  { id: LEASING_MAIN_STATUS.AWAITING_CONFIRMATION, label: 'Confirmation' },
  { id: LEASING_MAIN_STATUS.PREPARATION, label: 'Preparation' },
  { id: LEASING_MAIN_STATUS.ACTIVE_LEASING, label: 'Active leasing' },
  { id: LEASING_MAIN_STATUS.OFFER_PENDING, label: 'Offer' },
  { id: LEASING_MAIN_STATUS.ONBOARDING, label: 'Onboarding' },
  { id: LEASING_MAIN_STATUS.KEY_HANDOVER, label: 'Key handover' },
  { id: LEASING_MAIN_STATUS.COMPLETED, label: 'Completed' },
];

function LeasingStageRail({ status }: { status?: string | null }) {
  const index = RAIL.findIndex((step) => step.id === status);
  const completedAll = status === LEASING_MAIN_STATUS.COMPLETED;
  return (
    <section className="bg-card rounded-xl border px-3 py-4 shadow-sm">
      <ol className="flex w-full" aria-label="Leasing progress">
        {RAIL.map((step, i) => {
          const done = index >= 0 && (completedAll || i < index);
          const current = index >= 0 && !completedAll && i === index;
          const nextDone = index >= 0 && (completedAll || i + 1 < index);
          const nextCurrent = index >= 0 && !completedAll && i + 1 === index;
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
