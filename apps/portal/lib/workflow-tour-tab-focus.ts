export const WORKFLOW_TOUR_FOCUS_TAB_EVENT = 'crossub:workflow-tour-focus-tab';

export function focusWorkflowTourTab(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKFLOW_TOUR_FOCUS_TAB_EVENT));
}

export function shouldFocusWorkflowTourTab(target?: string): boolean {
  if (!target) return false;
  return (
    target === 'workflow-rail' ||
    target === 'workflow-tab-workflow' ||
    target === 'workflow-action-panel' ||
    target.startsWith('workflow-step-')
  );
}
