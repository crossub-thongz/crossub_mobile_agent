import type { ReportComparisonStageState } from './types';

export type TenantResponsibilityReviewStatus = 'none' | 'pending' | 'accepted' | 'declined';

export function tenantResponsibilityReviewStarted(
  rc: Pick<
    ReportComparisonStageState,
    | 'tenantResponsibility'
    | 'tenantComparisonSummaryEmail'
    | 'tenantResponsibilityAgentAcknowledged'
  > | null | undefined,
): boolean {
  if (!rc || (rc.tenantResponsibility ?? []).length === 0) return false;
  return (
    Boolean(rc.tenantComparisonSummaryEmail?.sentAt) ||
    rc.tenantResponsibilityAgentAcknowledged === true
  );
}

export function deriveTenantResponsibilityReviewStatus(
  rc: ReportComparisonStageState | null | undefined,
): TenantResponsibilityReviewStatus {
  if (!tenantResponsibilityReviewStarted(rc)) return 'none';
  const raw = rc?.tenantResponsibilityReviewStatus;
  if (raw === 'accepted' || raw === 'declined' || raw === 'pending') return raw;
  return 'pending';
}
