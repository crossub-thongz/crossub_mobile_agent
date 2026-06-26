import type { MaintenanceWorkspaceCase } from './types';

const STAGE_MINUTES: Record<string, number> = {
  under_review: 24 * 60,
  pending_evidence: 24 * 60,
  pending_quotation: 4 * 60,
  pending_approval: 24 * 60,
  in_progress: 48 * 60,
  completed: 48 * 60,
  closed: 48 * 60,
};

export function getMinutesRemainingForCase(
  request: MaintenanceWorkspaceCase,
  now = new Date(),
): number {
  const minutes = STAGE_MINUTES[request.status] ?? 24 * 60;
  const deadline = new Date(request.createdAt).getTime() + minutes * 60_000;
  return Math.floor((deadline - now.getTime()) / 60_000);
}

export function isCaseOverdue(request: MaintenanceWorkspaceCase, now = new Date()): boolean {
  return getMinutesRemainingForCase(request, now) < 0;
}
