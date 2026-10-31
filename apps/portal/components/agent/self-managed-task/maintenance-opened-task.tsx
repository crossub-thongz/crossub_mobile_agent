'use client';

import Link from 'next/link';
import { Building2, Clock, DollarSign, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  AdminSideCard,
  TaskBreadcrumb,
  TaskLocality,
  TaskMetaChip,
  TaskStatusPill,
} from '@/components/agent/self-managed-task/admin-task-chrome';
import { QuoteRecommendation } from '@/components/agent/quote-recommendation-card';
import { Button } from '@/components/ui/button';
import { ROUTES, propertyDetail } from '@/constants/routes';
import { formatCurrency } from '@/lib/utils';

/**
 * Self-Manage maintenance case, laid out like the admin case page: address header, the
 * working stage in the main column, timeline and property on the right.
 */
export function MaintenanceOpenedTask({
  address,
  locality,
  reference,
  issue,
  statusLabel,
  statusTone,
  assignedTo,
  dueLabel,
  priorityLabel,
  estimatedCost,
  propertyId,
  onCloseJob,
  requestId,
  onQuoteAccepted,
  workflow,
  activity,
  body,
}: {
  address: string;
  locality: string;
  reference: string;
  issue: string;
  statusLabel: string;
  statusTone: 'active' | 'attention' | 'done' | 'danger';
  assignedTo: string;
  dueLabel: string;
  priorityLabel: string | null;
  estimatedCost: number | null;
  propertyId: string;
  onCloseJob?: () => void;
  requestId?: string;
  onQuoteAccepted?: () => void;
  workflow?: ReactNode;
  activity?: ReactNode;
  /** Stage board and timeline, in place of the default two columns. */
  body?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 py-4 lg:px-8">
      <TaskBreadcrumb href={ROUTES.MAINTENANCE} label="Maintenance" segments={[reference]} />

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">{address}</h1>
            {priorityLabel ? (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                {priorityLabel}
              </span>
            ) : null}
            {onCloseJob ? (
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onCloseJob}>
                <XCircle className="size-3.5" />
                Close job
              </Button>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{issue}</p>
          <TaskLocality locality={locality} />
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <TaskStatusPill label={statusLabel} tone={statusTone} />
            <span>
              Task ID <TaskMetaChip>{reference}</TaskMetaChip>
            </span>
            <span aria-hidden>·</span>
            <span>
              Assigned to <span className="text-foreground font-medium">{assignedTo}</span>
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              Due {dueLabel}
            </span>
          </div>
        </div>

        <div className="rounded-lg border px-3 py-1.5">
          <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase">
            <DollarSign className="size-3" />
            Estimated cost
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {estimatedCost != null ? formatCurrency(estimatedCost) : '—'}
          </p>
        </div>
      </header>

      {requestId ? (
        <div className="mt-4">
          <QuoteRecommendation requestId={requestId} onAccepted={onQuoteAccepted} />
        </div>
      ) : null}

      {body ? <div className="mt-4 min-h-0 flex-1">{body}</div> : (
        <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">{workflow}</div>
          <div className="min-w-0 space-y-4">
            <AdminSideCard title="Activity">{activity}</AdminSideCard>
            {propertyId ? (
              <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                <Link href={propertyDetail(propertyId)}>
                  <Building2 className="size-4" />
                  View property
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
