import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import type { InspectionDetail } from '@/lib/inspections-types';
import { hasLeftTaskPool } from '@/lib/inspection-approval';

const SUBMITTED_STATUSES = new Set<string>([
  INSPECTION_RECORD_STATUS.FIRST_REVIEW,
  INSPECTION_RECORD_STATUS.SECOND_REVIEW,
  INSPECTION_RECORD_STATUS.COMPLETED,
  INSPECTION_RECORD_STATUS.PUBLISHED,
]);

/**
 * Agent portal should not surface in-progress area photos — only the finished report.
 *
 * View / Download stay hidden until CROSSUB has approved (or the job is
 * grandfathered). A submitted status or a report URL alone is not enough.
 */
export function isInspectionReportReadyForView(
  detail: InspectionDetail | null | undefined,
  options?: {
    reportUrl?: string | null;
    completedAt?: string | null;
    approvedAt?: string | null;
  },
): boolean {
  const completedAt = options?.completedAt ?? detail?.completedDate ?? null;
  const approvedAt = options?.approvedAt ?? detail?.approvedAt ?? null;
  if (!hasLeftTaskPool({ completedAt, approvedAt })) return false;
  const reportUrl = options?.reportUrl ?? detail?.reportUrl;
  if (reportUrl?.trim()) return true;
  if (!detail?.status) return false;
  return SUBMITTED_STATUSES.has(detail.status);
}
