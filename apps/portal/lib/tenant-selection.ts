import type { TenantSelectionCase, TimelineEntry } from '@/lib/types';

export type TenantSelectionDecision = {
  action: 'approved' | 'rejected';
  applicantName: string;
  applicantId?: string;
  decidedAt: string;
};

export function tenantSelectionDecisionKey(
  propertyId: string,
  selectionId?: string,
): string {
  return selectionId ?? `property:${propertyId}`;
}

export function isTenantSelectionPending(
  selection: TenantSelectionCase,
  decision?: TenantSelectionDecision | null,
): boolean {
  if (decision) return false;
  return selection.requiresApproval;
}

export function applyTenantSelectionDecision(
  selection: TenantSelectionCase,
  decision?: TenantSelectionDecision | null,
): TenantSelectionCase {
  if (!decision) return selection;

  const timelineEntry: TimelineEntry = {
    id: `decision-${decision.decidedAt}`,
    at: decision.decidedAt,
    actor: 'Agent',
    actorRole: 'agent',
    title:
      decision.action === 'approved'
        ? `Application approved — ${decision.applicantName}`
        : `Application declined — ${decision.applicantName}`,
    source: 'app',
  };

  return {
    ...selection,
    applicantName:
      decision.action === 'approved' ? decision.applicantName : selection.applicantName,
    status:
      decision.action === 'approved'
        ? `Approved — ${decision.applicantName}`
        : `Declined — ${decision.applicantName}`,
    requiresApproval: false,
    timeline: [...selection.timeline, timelineEntry],
  };
}
