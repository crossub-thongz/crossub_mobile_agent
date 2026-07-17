'use client';

import type { ReactNode } from 'react';

import { PriorityBadge, ResponsibilityBadge } from '@/components/maintenance-workspace/badges';
import { resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import type { MaintenanceRequest, Priority } from '@/lib/types';

function priorityForBadge(priority: Priority): string {
  return priority === 'urgent' || priority === 'high' ? 'urgent' : 'normal';
}

function SummaryField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-snug">{children}</dd>
    </div>
  );
}

export function MaintenanceJobTypeSummary({
  item,
  workflowCtx,
  syncing,
}: {
  item: MaintenanceRequest;
  workflowCtx: MaintenanceWorkflowContext;
  syncing?: boolean;
}) {
  const resolvedResponsibility = resolveMaintenanceResponsibility(workflowCtx);

  return (
    <div className="rounded-xl border bg-card px-4 py-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <SummaryField label="Job type">Maintenance</SummaryField>
        <SummaryField label="Urgency status">
          <PriorityBadge priority={priorityForBadge(item.priority)} />
        </SummaryField>
        <SummaryField label="Responsible party" className="sm:col-span-2">
          {!resolvedResponsibility || resolvedResponsibility === 'pending' ? (
            <span className="text-muted-foreground text-sm font-medium">Pending assignment</span>
          ) : (
            <ResponsibilityBadge responsibility={resolvedResponsibility} />
          )}
        </SummaryField>
      </dl>
      <p className="text-primary mt-3 text-xs font-semibold">
        {item.status}
        {syncing ? <span className="text-muted-foreground font-normal"> · Updating…</span> : null}
      </p>
    </div>
  );
}
