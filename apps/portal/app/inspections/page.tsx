'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { InspectionsModule } from '@/components/agent/module-workspace/inspections-module';
import { TasksFilterRedirect } from '@/components/agent/module-workspace/tasks-filter-redirect';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { INSPECTIONS_WORKSPACE_COPY } from '@/constants/module-workspace';
import { inspectionNew } from '@/constants/routes';
import { INSPECTIONS_PAGE_ACTIONS } from '@/constants/self-managed-inspections';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

/**
 * Inspections list hub is retired for every other tier: they view and create jobs on Tasks.
 * Self-Manage agents get the desktop inspections page. A row opens the full task.
 */
export default function InspectionsPage() {
  const { ready, selfManaged } = useSelfManagedAccess();

  if (!ready) return null;
  if (!selfManaged) return <TasksFilterRedirect filter="Inspection" />;

  return (
    <AgentShell
      title={INSPECTIONS_WORKSPACE_COPY.title}
      wide
      fillMain
      hideNeedAction
      headerActions={
        // A Self-Manage property books with the agency's own inspector in the wizard.
        <Button asChild size="sm">
          <Link href={inspectionNew()}>
            <Plus className="size-4" />
            {INSPECTIONS_PAGE_ACTIONS.book}
          </Link>
        </Button>
      }
    >
      <InspectionsModule />
    </AgentShell>
  );
}
