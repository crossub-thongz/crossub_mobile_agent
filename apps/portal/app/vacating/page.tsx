'use client';

import { TaskStatusRow } from '@/components/agent/task-status-row';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { vacatingDetail } from '@/constants/routes';
import { vacatingWorkflowProgress } from '@/lib/case-workflows';
import { formatDate } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export default function VacatingPage() {
  const { vacating } = useAgentData();

  return (
    <AgentShell title="End leasing">
      <div className="space-y-2">
        {vacating.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active end-leasing cases.</p>
        ) : (
          vacating.map((v) => {
            const { currentStepLabel } = vacatingWorkflowProgress(v);
            const caseRef = workflowCaseReferenceLabel(v.id, 'end_leasing');
            const vacateLabel = v.vacateDate ? `Vacate ${formatDate(v.vacateDate)}` : 'Vacate date TBC';

            return (
              <TaskStatusRow
                key={v.id}
                item={{
                  id: v.id,
                  propertyAddress: v.propertyAddress,
                  taskLabel: `${caseRef} · ${vacateLabel}`,
                  status: currentStepLabel,
                  href: vacatingDetail(v.id),
                  module: 'End leasing',
                  tone: v.requiresApproval ? 'warning' : 'neutral',
                  requiresApproval: v.requiresApproval,
                }}
              />
            );
          })
        )}
      </div>
    </AgentShell>
  );
}
