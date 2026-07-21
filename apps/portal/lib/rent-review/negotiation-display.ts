import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';

/** Tenant counter is pending agent review. */
export function hasPendingTenantCounter(detail: RentReviewWorkflowDetail): boolean {
  return (
    detail.tenantCounterWeekly != null &&
    (detail.workflowState === 'agent_review' || detail.workflowState === 'negotiation')
  );
}

/** Formal notice sent — awaiting tenant accept, decline, or counter-offer. */
export function isPendingNegotiation(detail: RentReviewWorkflowDetail): boolean {
  if (!detail.auditLog.some((e) => e.kind === 'tenant_notices_dispatched')) return false;
  if (hasPendingTenantCounter(detail)) return false;
  if (
    ['tenant_accepted', 'tenant_rejected', 'accounting', 'completed'].includes(
      detail.workflowState,
    )
  ) {
    return false;
  }
  return detail.workflowState === 'tenant_notified' || detail.workflowState === 'negotiation';
}

/** Weekly rent on the first formal notice emailed to the tenant. */
export function resolveInitialNoticeWeeklyRent(
  detail: RentReviewWorkflowDetail,
): number | null {
  const milestone = [...(detail.pricingMilestones ?? [])]
    .filter((m) => m.headline === 'Delivered to tenant')
    .sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )[0];
  return milestone?.weeklyRent ?? null;
}

/**
 * A new formal NSW notice is only required when the agent counter-offer exceeds
 * the amount on the original notice sent to the tenant.
 */
export function requiresFormalNoticeResend(detail: RentReviewWorkflowDetail): boolean {
  if (!detail.auditLog.some((e) => e.kind === 'agent_reproposed_after_counter')) {
    return false;
  }
  const initial = resolveInitialNoticeWeeklyRent(detail);
  const current = detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly;
  if (initial == null || current == null) return false;
  return current > initial;
}

/** Agent resolved a counter with a higher rent — must re-send the formal notice. */
export function canResendTenantNotice(detail: RentReviewWorkflowDetail): boolean {
  return (
    detail.workflowState === 'agent_review' &&
    detail.tenantCounterWeekly == null &&
    detail.auditLog.some((e) => e.kind === 'tenant_notices_dispatched') &&
    requiresFormalNoticeResend(detail)
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
