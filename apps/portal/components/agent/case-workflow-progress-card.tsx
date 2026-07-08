'use client';

import { WorkflowStageRail, type WorkflowStageItem } from '@/components/agent/workflow-stage-rail';
import type { CaseWorkflowProgress } from '@/lib/case-workflows';

export function CaseWorkflowProgressCard({
  progress,
  subtitle,
}: {
  progress: CaseWorkflowProgress;
  subtitle?: string;
}) {
  const stages: WorkflowStageItem[] = progress.steps.map((step) => ({
    id: step.id,
    label: step.label,
    status: step.status === 'done' ? 'done' : step.status === 'current' ? 'current' : 'upcoming',
  }));

  return (
    <div className="space-y-2">
      <WorkflowStageRail stages={stages} title={progress.title} />
      {subtitle ? (
        <p className="text-muted-foreground px-1 text-xs">
          Current step: <span className="font-medium text-foreground">{subtitle}</span>
        </p>
      ) : (
        <p className="text-muted-foreground px-1 text-xs">
          Current step:{' '}
          <span className="font-medium text-foreground">{progress.currentStepLabel}</span>
        </p>
      )}
    </div>
  );
}
