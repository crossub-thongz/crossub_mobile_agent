'use client';

import { useMemo } from 'react';

import { JobCaseSentEmailPreviewCard } from '@/components/agent/job-case-email-log';
import { ResponsibilityBadge } from '@/components/maintenance-workspace/badges';
import {
  buildJobCreatedEmails,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';

export function MaintenanceJobCreatedPanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const responsibility = resolveMaintenanceResponsibility(ctx);
  const jobCreatedEmails = useMemo(() => buildJobCreatedEmails(ctx), [ctx]);
  const tenantAckEmail = jobCreatedEmails.find((e) => e.kind === 'job_created_tenant_ack');
  const agentNotifyEmail = jobCreatedEmails.find((e) => e.kind === 'job_created_agent');

  return (
    <div className="space-y-4">
      {responsibility ? (
        <p className="text-muted-foreground text-xs">
          Responsibility later assigned:{' '}
          <ResponsibilityBadge responsibility={responsibility} />
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Job logged and awaiting admin review for responsibility.
        </p>
      )}

      <section className="space-y-2">
        <p className="text-sm font-semibold">Job created emails</p>
        <p className="text-muted-foreground text-xs">
          When a tenant logs a repair, CROSSUB acknowledges receipt and notifies assigned agents.
        </p>
        {tenantAckEmail ? (
          <JobCaseSentEmailPreviewCard
            title="Tenant acknowledgment email"
            record={tenantAckEmail}
          />
        ) : (
          <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
            Tenant acknowledgment email will appear here once the repair request is logged and
            delivered.
          </p>
        )}
        {agentNotifyEmail ? (
          <JobCaseSentEmailPreviewCard
            title="Agent notification email"
            record={agentNotifyEmail}
          />
        ) : ctx.workspaceCase.source === 'tenant_app' ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
            Agent notification email will appear here once assigned agents are notified.
          </p>
        ) : null}
      </section>
    </div>
  );
}
