'use client';

import { LeasingModule } from '@/components/agent/module-workspace/leasing-module';
import { TasksFilterRedirect } from '@/components/agent/module-workspace/tasks-filter-redirect';
import { AgentShell } from '@/components/layout/agent-shell';
import { LEASING_WORKSPACE_COPY } from '@/constants/module-workspace';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

/**
 * Leasing list hub is retired for every other tier: they view and create jobs on Tasks.
 * Self-Manage agents get the desktop leasing page instead (list-and-detail split pane).
 */
export default function LeasingPage() {
  const { ready, selfManaged } = useSelfManagedAccess();

  if (!ready) return null;
  if (!selfManaged) return <TasksFilterRedirect filter="Leasing" />;

  return (
    <AgentShell title={LEASING_WORKSPACE_COPY.title} wide fillMain hideNeedAction>
      <LeasingModule />
    </AgentShell>
  );
}
