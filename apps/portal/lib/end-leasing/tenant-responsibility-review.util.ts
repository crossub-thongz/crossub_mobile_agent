import { TENANT_REPAIR_RESPONSE } from '@/constants/end-leasing';

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

/**
 * The tenant responsibility summary stays sent until the tenant disagrees. A decline reopens the
 * send so the agency can email the revised list; the API resets the review to pending on resend.
 */
export function tenantComparisonSummarySent(
  rc: ReportComparisonStageState | null | undefined,
): boolean {
  return (
    Boolean(rc?.tenantComparisonSummaryEmail?.sentAt) &&
    deriveTenantResponsibilityReviewStatus(rc) !== TENANT_REPAIR_RESPONSE.DECLINED
  );
}
