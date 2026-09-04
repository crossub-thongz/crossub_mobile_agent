import type { AgentWorkflowTourId } from '@/constants/agent-workflow-tour';

export const AGENT_WORKFLOW_TOUR_EVENT = 'crossub:agent-workflow-tour';
export const PENDING_WORKFLOW_TOUR_KEY = 'crossub:pending-workflow-tour';
export const WORKFLOW_TOUR_OPEN_CREATE_MENU_EVENT = 'crossub:workflow-tour-open-create-menu';
export const WORKFLOW_TOUR_CASE_CREATED_EVENT = 'crossub:workflow-tour-case-created';

export function shouldOpenWorkflowTourCreateMenu(target?: string): boolean {
  if (!target) return false;
  return target === 'tasks-new' || target.startsWith('workflow-tour-new-action-');
}

export function startAgentWorkflowTour(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AGENT_WORKFLOW_TOUR_EVENT));
}

export function requestWorkflowTourOpenCreateMenu(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKFLOW_TOUR_OPEN_CREATE_MENU_EVENT));
}

export function notifyWorkflowTourCaseCreated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORKFLOW_TOUR_CASE_CREATED_EVENT));
}

export function subscribeAgentWorkflowTour(onStart: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => onStart();
  window.addEventListener(AGENT_WORKFLOW_TOUR_EVENT, handler);
  return () => window.removeEventListener(AGENT_WORKFLOW_TOUR_EVENT, handler);
}

export function subscribeWorkflowTourOpenCreateMenu(onOpen: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => onOpen();
  window.addEventListener(WORKFLOW_TOUR_OPEN_CREATE_MENU_EVENT, handler);
  return () => window.removeEventListener(WORKFLOW_TOUR_OPEN_CREATE_MENU_EVENT, handler);
}

export function subscribeWorkflowTourCaseCreated(onCreated: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => onCreated();
  window.addEventListener(WORKFLOW_TOUR_CASE_CREATED_EVENT, handler);
  return () => window.removeEventListener(WORKFLOW_TOUR_CASE_CREATED_EVENT, handler);
}

export function setPendingWorkflowTour(id: AgentWorkflowTourId): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_WORKFLOW_TOUR_KEY, id);
}

export function readPendingWorkflowTour(): AgentWorkflowTourId | null {
  if (typeof window === 'undefined') return null;
  const value = sessionStorage.getItem(PENDING_WORKFLOW_TOUR_KEY);
  if (
    value === 'maintenance' ||
    value === 'inspections' ||
    value === 'new_leasing' ||
    value === 'end_leasing' ||
    value === 'tribunal'
  ) {
    return value;
  }
  return null;
}

export function clearPendingWorkflowTour(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_WORKFLOW_TOUR_KEY);
}
