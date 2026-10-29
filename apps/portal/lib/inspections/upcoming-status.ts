import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';

/**
 * Whether an inspection is booked but its visit has not come yet. The server moves a job to
 * IN_PROGRESS as soon as an inspector is assigned, which is at booking for an agency's own
 * inspector, so "In Progress" would show on a visit days away.
 */
export function isInspectionUpcoming(
  status: string,
  scheduledAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (status !== INSPECTION_RECORD_STATUS.IN_PROGRESS || !scheduledAt) return false;
  const at = new Date(scheduledAt).getTime();
  return Number.isFinite(at) && at > now.getTime();
}
