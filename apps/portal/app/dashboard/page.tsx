'use client';

import { CustomizableDashboard } from '@/components/agent/dashboard/customizable-dashboard';
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
      <CustomizableDashboard
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
