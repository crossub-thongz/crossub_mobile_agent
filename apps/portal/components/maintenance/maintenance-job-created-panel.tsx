'use client';

import { ResponsibilityBadge } from '@/components/maintenance-workspace/badges';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import { resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';

export function MaintenanceJobCreatedPanel({ ctx }: { ctx: MaintenanceWorkflowContext }) {
  const responsibility = resolveMaintenanceResponsibility(ctx);

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
    </div>
  );
}
