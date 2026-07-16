'use client';

import { ResponsibilityBadge } from '@/components/maintenance-workspace/badges';
import { maintenanceSourceLabel } from '@/lib/maintenance/maintenance-source-labels';
import {
  auditEntriesForStep,
  MAINTENANCE_AGENT_STEP,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { formatDateTime } from '@/lib/utils';

function emailSummary(ctx: MaintenanceWorkflowContext): string {
  const fromNotifications = ctx.workspaceCase.notifications.find(
    (n) => n.channel === 'email',
  );
  if (fromNotifications?.title) return fromNotifications.title;
  if (ctx.workspaceCase.tenant?.email) return ctx.workspaceCase.tenant.email;
  return 'No email records yet';
}

export function MaintenanceJobCreatedPanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.JOB_CREATED);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Job intake</p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Created by</dt>
            <dd className="font-medium">{maintenanceSourceLabel(ctx.workspaceCase.source)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date &amp; time created</dt>
            <dd className="font-medium">{formatDateTime(ctx.workspaceCase.createdAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium break-words">{emailSummary(ctx)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Issue type</dt>
            <dd className="font-medium">{ctx.workspaceCase.issueType}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Order number</dt>
            <dd className="text-primary font-medium tabular-nums">{ctx.workspaceCase.caseRef}</dd>
          </div>
        </dl>
      </section>

      {audit.length > 0 ? (
        <div className="rounded-xl border bg-card p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Stage events
          </p>
          <ol className="space-y-2">
            {audit.map((entry) => (
              <li key={entry.id} className="text-xs">
                <p className="font-medium">{entry.message}</p>
                <p className="text-muted-foreground mt-0.5">
                  {formatDateTime(entry.timestamp)} · {entry.actor}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {ctx.workspaceCase.responsibility ? (
        <p className="text-muted-foreground text-xs">
          Responsibility later assigned:{' '}
          <ResponsibilityBadge responsibility={ctx.workspaceCase.responsibility} />
        </p>
      ) : null}
    </div>
  );
}
