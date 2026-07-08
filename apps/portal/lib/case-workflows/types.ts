export type WorkflowStepVisual = 'done' | 'current' | 'upcoming';

export type CaseWorkflowStep = {
  id: string;
  label: string;
  status: WorkflowStepVisual;
};

export type CaseWorkflowProgress = {
  title: string;
  steps: CaseWorkflowStep[];
  currentStepId: string;
  currentStepLabel: string;
};
