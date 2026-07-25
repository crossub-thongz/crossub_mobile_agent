import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import type { InspectionDetail } from '@/lib/inspections-types';

const SUBMITTED_STATUSES = new Set<string>([
  INSPECTION_RECORD_STATUS.FIRST_REVIEW,
  INSPECTION_RECORD_STATUS.SECOND_REVIEW,
  INSPECTION_RECORD_STATUS.COMPLETED,
  INSPECTION_RECORD_STATUS.PUBLISHED,
]);

/** Agent portal should not surface in-progress area photos — only the finished report. */
export function isInspectionReportReadyForView(
  detail: InspectionDetail | null | undefined,
  options?: { reportUrl?: string | null },
): boolean {
  const reportUrl = options?.reportUrl ?? detail?.reportUrl;
  if (reportUrl?.trim()) return true;
  if (!detail?.status) return false;
  return SUBMITTED_STATUSES.has(detail.status);
}
