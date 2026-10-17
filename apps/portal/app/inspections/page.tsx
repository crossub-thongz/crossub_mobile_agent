'use client';

import { InspectionsModule } from '@/components/agent/module-workspace/inspections-module';
import { TasksFilterRedirect } from '@/components/agent/module-workspace/tasks-filter-redirect';
import { AgentShell } from '@/components/layout/agent-shell';
import { INSPECTIONS_WORKSPACE_COPY } from '@/constants/module-workspace';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

/**
 * Inspections list hub is retired for every other tier: they view and create jobs on Tasks.
 * Self-Manage agents get the desktop inspections page instead (list-and-detail split pane).
 */
export default function InspectionsPage() {
  const { ready, selfManaged } = useSelfManagedAccess();

  if (!ready) return null;
  if (!selfManaged) return <TasksFilterRedirect filter="Inspection" />;

  return (
    <AgentShell title={INSPECTIONS_WORKSPACE_COPY.title} wide fillMain hideNeedAction>
      <InspectionsModule />
    </AgentShell>
  );
}
