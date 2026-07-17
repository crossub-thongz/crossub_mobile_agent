'use client';

import { ResponsibilityBadge } from '@/components/maintenance-workspace/badges';
import {
  auditEntriesForStep,
  MAINTENANCE_AGENT_STEP,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';
import { formatDateTime } from '@/lib/utils';

export function MaintenanceJobCreatedPanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.JOB_CREATED);
  const responsibility = resolveMaintenanceResponsibility(ctx);

  return (
    <div className="space-y-4">
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

      {responsibility ? (
        <p className="text-muted-foreground text-xs">
          Responsibility later assigned:{' '}
          <ResponsibilityBadge responsibility={responsibility} />
        </p>
      ) : null}
    </div>
  );
}
