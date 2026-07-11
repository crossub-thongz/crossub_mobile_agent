'use client';

import {
  auditEntriesForStep,
  MAINTENANCE_AGENT_STEP,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { formatDateTime } from '@/lib/utils';

export function MaintenanceJobCompletedPanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.JOB_COMPLETED);
  const isClosed = ctx.workspaceCase.status === 'closed';

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Completion &amp; invoicing</p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Completion photos</dt>
            <dd className="font-medium">
              {ctx.workspaceCase.completionEvidenceUploaded ? 'Synced to system' : 'Pending upload'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Invoice to agent</dt>
            <dd className="font-medium">
              {ctx.workspaceCase.invoiceUploaded ? 'Sent' : 'Pending'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Payment confirmed</dt>
            <dd className="font-medium">{isClosed ? 'Confirmed' : 'Awaiting confirmation'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Job status</dt>
            <dd className="font-medium capitalize">{ctx.workspaceCase.status.replace(/_/g, ' ')}</dd>
          </div>
        </dl>
      </section>

      {!isClosed && ctx.workspaceCase.status === 'completed' ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
          Confirm invoice payment in the full maintenance workspace to close this job.
        </p>
      ) : null}

      {audit.length > 0 ? (
        <div className="rounded-xl border bg-card p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Completion events
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
