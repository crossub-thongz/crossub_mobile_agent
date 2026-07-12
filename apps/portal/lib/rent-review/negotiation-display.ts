import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';

/** Tenant counter is pending agent review. */
export function hasPendingTenantCounter(detail: RentReviewWorkflowDetail): boolean {
  return (
    detail.tenantCounterWeekly != null &&
    (detail.workflowState === 'agent_review' || detail.workflowState === 'negotiation')
  );
}

/** Agent resolved a counter and must re-send the formal notice with updated terms. */
export function canResendTenantNotice(detail: RentReviewWorkflowDetail): boolean {
  return (
    detail.workflowState === 'agent_review' &&
    detail.tenantCounterWeekly == null &&
    detail.auditLog.some((e) => e.kind === 'tenant_notices_dispatched') &&
    detail.auditLog.some(
      (e) =>
        e.kind === 'agent_reproposed_after_counter' || e.kind === 'agent_marked_non_negotiable',
    )
  );
}

export function agentProposedWeekly(detail: RentReviewWorkflowDetail): number | null {
  return detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? null;
}

export function buildNegotiationComparison(detail: RentReviewWorkflowDetail): {
  agentWeekly: number | null;
  tenantCounterWeekly: number | null;
  deltaWeekly: number | null;
} {
  const agentWeekly = agentProposedWeekly(detail);
  const tenantCounterWeekly = detail.tenantCounterWeekly;
  const deltaWeekly =
    agentWeekly != null && tenantCounterWeekly != null
      ? tenantCounterWeekly - agentWeekly
      : null;
  return { agentWeekly, tenantCounterWeekly, deltaWeekly };
}

export function formatNegotiationDelta(deltaWeekly: number | null): string | null {
  if (deltaWeekly == null || deltaWeekly === 0) return null;
  const sign = deltaWeekly > 0 ? '+' : '−';
  return `${sign}$${Math.abs(deltaWeekly).toFixed(0)}/wk vs agent proposal`;
}
