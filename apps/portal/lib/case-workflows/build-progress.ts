import type { CaseWorkflowProgress, CaseWorkflowStep, WorkflowStepVisual } from './types';

export function buildCaseWorkflowProgress(
  title: string,
  stepDefs: readonly { id: string; label: string }[],
  currentStepId: string,
): CaseWorkflowProgress {
  const currentIndex = Math.max(
    0,
    stepDefs.findIndex((s) => s.id === currentStepId),
  );

  const steps: CaseWorkflowStep[] = stepDefs.map((step, index) => {
    let status: WorkflowStepVisual = 'upcoming';
    if (index < currentIndex) status = 'done';
    else if (index === currentIndex) status = 'current';
    return { id: step.id, label: step.label, status };
  });

  const current = stepDefs[currentIndex] ?? stepDefs[0]!;

  return {
    title,
    steps,
    currentStepId: current.id,
    currentStepLabel: current.label,
  };
}
