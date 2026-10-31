'use client';

import { MaintenanceModule } from '@/components/agent/module-workspace/maintenance-module';
import { QuoteRecommendation } from '@/components/agent/quote-recommendation-card';
import { TasksFilterRedirect } from '@/components/agent/module-workspace/tasks-filter-redirect';
import { AgentShell } from '@/components/layout/agent-shell';
import { MAINTENANCE_WORKSPACE_COPY } from '@/constants/module-workspace';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

/**
 * Maintenance list hub is retired for every other tier: they view and create jobs on Tasks.
 * Self-Manage agents get the desktop maintenance page. A row opens the full task.
 */
export default function MaintenancePage() {
  const { ready, selfManaged } = useSelfManagedAccess();

  if (!ready) return null;
  if (!selfManaged) return <TasksFilterRedirect filter="Maintenance" />;

  return (
    <AgentShell title={MAINTENANCE_WORKSPACE_COPY.title} wide fillMain hideNeedAction>
      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <div className="lg:px-8 lg:pt-4">
          <QuoteRecommendation />
        </div>
        <MaintenanceModule />
      </div>
    </AgentShell>
  );
}
