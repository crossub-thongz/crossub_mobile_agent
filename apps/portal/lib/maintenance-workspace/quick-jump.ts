import type { ApiMaintenanceAuditLogEntry } from '@/lib/crossub-api/types';

import type { MaintenanceWorkspaceCase, MaintenanceWorkspaceStatus } from './types';

export type QuickJumpTarget =
  | 'review'
  | 'quotation'
  | 'approval'
  | 'in_progress'
  | 'completion'
  | 'closed';

export function stepIdToTargetKey(stepId: string): QuickJumpTarget | null {
  switch (stepId) {
    case 'created':
    case 'resp':
    case 'review':
      return 'review';
    case 'contractor_quote':
      return 'quotation';
    case 'agent_approval':
      return 'approval';
    case 'tenant_responsible':
    case 'strata_responsible':
    case 'in_progress':
      return 'in_progress';
    case 'completion':
      return 'completion';
    case 'closed':
      return 'closed';
    default:
      return null;
  }
}

export function targetKeyToStatus(target: QuickJumpTarget): MaintenanceWorkspaceStatus {
  switch (target) {
    case 'review':
      return 'under_review';
    case 'quotation':
      return 'pending_quotation';
    case 'approval':
      return 'pending_approval';
    case 'in_progress':
      return 'in_progress';
    case 'completion':
      return 'completed';
    case 'closed':
      return 'closed';
  }
}

export function getQuickJumpCurrentRank(status: MaintenanceWorkspaceStatus): number {
  if (status === 'under_review' || status === 'pending_evidence') return 1;
  if (status === 'pending_quotation') return 2;
  if (status === 'pending_approval') return 3;
  if (status === 'in_progress') return 4;
  if (status === 'completed') return 5;
  if (status === 'closed') return 6;
  return 0;
}

const TARGET_RANK: Record<QuickJumpTarget, number> = {
  review: 1,
  quotation: 2,
  approval: 3,
  in_progress: 4,
  completion: 5,
  closed: 6,
};

export function isStageEnabled(
  target: QuickJumpTarget,
  currentRank: number,
): boolean {
  return currentRank >= TARGET_RANK[target];
}

export function filterAuditForTarget(
  entries: ApiMaintenanceAuditLogEntry[],
  target: QuickJumpTarget,
): ApiMaintenanceAuditLogEntry[] {
  const msg = (e: ApiMaintenanceAuditLogEntry) => e.message.toLowerCase();

  return entries.filter((entry) => {
    const text = msg(entry);
    switch (target) {
      case 'review':
        return (
          text.includes('job created') ||
          text.includes('under review') ||
          text.includes('responsibility') ||
          text.includes('evidence') ||
          entry.action === 'responsibility_set'
        );
      case 'quotation':
        return (
          text.includes('quotation') ||
          text.includes('contractor') ||
          text.includes('pending quotation') ||
          entry.action === 'quotation_created' ||
          entry.action === 'contractor_assigned'
        );
      case 'approval':
        return (
          text.includes('approval') ||
          text.includes('approved') ||
          text.includes('declined') ||
          entry.action === 'quotation_approved' ||
          entry.action === 'quotation_declined'
        );
      case 'in_progress':
        return text.includes('in progress') || text.includes('on site') || text.includes('repair');
      case 'completion':
        return (
          text.includes('complete') ||
          text.includes('evidence') ||
          text.includes('sign-off') ||
          text.includes('signoff')
        );
      case 'closed':
        return text.includes('closed') || text.includes('invoice');
      default:
        return false;
    }
  });
}

export function previewTitleForTarget(
  target: QuickJumpTarget,
  workspaceCase: MaintenanceWorkspaceCase,
): string {
  switch (target) {
    case 'review':
      return 'Review';
    case 'quotation':
      return 'Contractor Quote';
    case 'approval':
      return 'Agent Approval';
    case 'in_progress':
      return 'In Progress';
    case 'completion':
      return 'Completion';
    case 'closed':
      return 'Closed';
  }
}

export function previewSummaryForTarget(
  target: QuickJumpTarget,
  workspaceCase: MaintenanceWorkspaceCase,
): string {
  const responsibility = workspaceCase.responsibility
    ? `${workspaceCase.responsibility.charAt(0).toUpperCase()}${workspaceCase.responsibility.slice(1)} responsibility`
    : 'Responsibility not yet assigned';

  switch (target) {
    case 'review':
      return `Case opened and reviewed. ${responsibility} was determined from submitted evidence.`;
    case 'quotation':
      return 'Contractor was invited to submit a quotation for landlord-responsible work.';
    case 'approval':
      return 'Agent reviewed the submitted quotation and recorded an approval decision.';
    case 'in_progress':
      return 'Approved work proceeded on site. Completion evidence and tenant sign-off may follow.';
    case 'completion':
      return 'Contractor marked work complete. Evidence upload and tenant approval were tracked here.';
    case 'closed':
      return 'Case closed after invoice and final workflow checks were recorded.';
  }
}
