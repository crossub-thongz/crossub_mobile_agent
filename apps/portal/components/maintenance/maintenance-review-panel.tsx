'use client';

import { ResponsibilityBadge } from '@/components/maintenance-workspace/badges';
import {
  auditEntriesForStep,
  MAINTENANCE_AGENT_STEP,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { formatDateTime } from '@/lib/utils';

export function MaintenanceReviewPanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.REVIEW);
  const responsibility = ctx.workspaceCase.responsibility;
  const isLive =
    ctx.workspaceCase.status === 'under_review' || ctx.workspaceCase.status === 'pending_evidence';

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Responsibility review</p>
        <p className="text-muted-foreground mb-3 text-xs">
          Confirm whether the repair is landlord, tenant, or strata responsibility. Verify uploaded
          photos and videos are clear enough to assess the issue.
        </p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Responsible party</dt>
            <dd className="mt-1">
              {responsibility ? (
                <ResponsibilityBadge responsibility={responsibility} />
              ) : (
                <span className="text-muted-foreground font-medium">Pending assignment</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Media verification</dt>
            <dd className="font-medium">
              {responsibility || !isLive ? 'Reviewed' : 'Awaiting verification'}
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          {ctx.workspaceCase.description}
        </p>
      </section>

      {isLive ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
          Open the full maintenance workspace to assign responsibility or request additional
          evidence.
        </p>
      ) : null}

      {audit.length > 0 ? (
        <div className="rounded-xl border bg-card p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Review events
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
    </div>
  );
}
