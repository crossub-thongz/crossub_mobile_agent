'use client';

import { MaintenanceModule } from '@/components/agent/module-workspace/maintenance-module';
import { TasksFilterRedirect } from '@/components/agent/module-workspace/tasks-filter-redirect';
import { AgentShell } from '@/components/layout/agent-shell';
import { MAINTENANCE_WORKSPACE_COPY } from '@/constants/module-workspace';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

/**
 * Maintenance list hub is retired for every other tier: they view and create jobs on Tasks.
 * Self-Manage agents get the desktop maintenance page instead (list-and-detail split pane).
 */
export default function MaintenancePage() {
  const { ready, selfManaged } = useSelfManagedAccess();

  if (!ready) return null;
  if (!selfManaged) return <TasksFilterRedirect filter="Maintenance" />;

  return (
    <AgentShell title={MAINTENANCE_WORKSPACE_COPY.title} wide fillMain hideNeedAction>
      <MaintenanceModule />
    </AgentShell>
  );
}
