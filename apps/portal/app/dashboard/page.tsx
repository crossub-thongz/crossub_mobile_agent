'use client';

import { ClassicDashboard } from '@/components/agent/dashboard/classic-dashboard';
import { V2Dashboard } from '@/components/agent/dashboard/v2-dashboard';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';

export default function DashboardPage() {
  const isV2 = useIsAgentUiV2();
  const {
    dashboardKpis,
    properties,
    needActionItems,
    hasFullManagementAccess,
  } = useAgentData();

  if (isV2) {
    return (
      <AgentShell>
        <V2Dashboard />
      </AgentShell>
    );
  }

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
