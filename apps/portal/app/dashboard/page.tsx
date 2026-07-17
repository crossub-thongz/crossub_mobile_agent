'use client';

import { ClassicDashboard } from '@/components/agent/dashboard/classic-dashboard';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';

export default function DashboardPage() {
  const {
    dashboardKpis,
    properties,
    needActionItems,
    hasFullManagementAccess,
  } = useAgentData();

  return (
    <AgentShell title="Dashboard">
      <ClassicDashboard
        context={{
          properties,
          dashboardKpis,
          needActionCount: needActionItems.length,
          hasFullManagementAccess,
        }}
      />
    </AgentShell>
  );
}
