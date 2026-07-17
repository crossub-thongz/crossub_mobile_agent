'use client';

import { maintenanceSourceLabel } from '@/lib/maintenance/maintenance-source-labels';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import { formatDateTime } from '@/lib/utils';

export function MaintenanceJobIntakeSummary({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const tenant = ctx.workspaceCase.tenant;

  return (
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
        <div>
          <dt className="text-muted-foreground">Tenant contact</dt>
          <dd className="font-medium">{tenant?.name?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="font-medium">{tenant?.phone?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium break-words">{tenant?.email?.trim() || '—'}</dd>
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
  );
}
