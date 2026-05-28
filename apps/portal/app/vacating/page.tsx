'use client';

import { TaskStatusRow } from '@/components/agent/task-status-row';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { vacatingDetail } from '@/constants/routes';

export default function VacatingPage() {
  const { vacating } = useAgentData();

  return (
    <AgentShell title="Vacating">
      <div className="space-y-2">
        {vacating.map((v) => (
          <TaskStatusRow
            key={v.id}
            item={{
              id: v.id,
              propertyAddress: v.propertyAddress,
              taskLabel: 'Vacating',
              status: `${v.checklistProgress}% complete · ${v.bondStatus}`,
              href: vacatingDetail(v.id),
              module: 'Vacating',
              tone: v.requiresApproval ? 'warning' : 'neutral',
              requiresApproval: v.requiresApproval,
            }}
          />
        ))}
      </div>
    </AgentShell>
  );
}
