import { INSPECTION_STATUS } from '@/constants/api-enums';
import { INSPECTION_APPROVAL_GO_LIVE } from '@/constants/inspection-approval';
import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';

const STATUS_RANK: Record<string, number> = {
  [INSPECTION_STATUS.CANCELLED]: 0,
  [INSPECTION_STATUS.DRAFT]: 1,
  [INSPECTION_STATUS.IN_PROGRESS]: 2,
  [INSPECTION_STATUS.FIRST_REVIEW]: 3,
  [INSPECTION_STATUS.SECOND_REVIEW]: 4,
  [INSPECTION_STATUS.COMPLETED]: 5,
  [INSPECTION_STATUS.PUBLISHED]: 6,
};

/**
 * Prefer the further-along inspection status so a stale DRAFT list row cannot
 * rewind a live COMPLETED (or published) payload.
 */
export function furthestInspectionStatus(
  ...statuses: Array<string | null | undefined>
): string {
  let best = '';
  let bestRank = -1;
  for (const raw of statuses) {
    const status = (raw ?? '').toUpperCase();
    if (!status) continue;
    const rank = STATUS_RANK[status] ?? -1;
    if (rank > bestRank) {
      best = status;
      bestRank = rank;
    }
  }
  return best;
}

export function isAfterApprovalGoLive(completedAt: string): boolean {
  const completed = new Date(completedAt).getTime();
  if (Number.isNaN(completed)) return false;
  return completed >= new Date(INSPECTION_APPROVAL_GO_LIVE).getTime();
}

export function awaitsOfficerApproval(job: {
  completedAt?: string | null;
  approvedAt?: string | null;
}): boolean {
  if (job.approvedAt) return false;
  if (!job.completedAt) return false;
  return isAfterApprovalGoLive(job.completedAt);
}

export function hasLeftTaskPool(job: {
  completedAt?: string | null;
  approvedAt?: string | null;
}): boolean {
  if (job.approvedAt) return true;
  if (!job.completedAt) return false;
  return !isAfterApprovalGoLive(job.completedAt);
}

/**
 * Agent-facing: inspector has finished, CROSSUB has not approved yet.
 *
 * Uses the same go-live cutoff as the admin Task Pool so historical completed
 * jobs are not rewritten as awaiting approval.
 */
export function awaitsCrossubApproval(job: {
  status?: string | null;
  completedAt?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;
}): boolean {
  const status = (job.status ?? '').toUpperCase();
  if (status !== INSPECTION_RECORD_STATUS.COMPLETED && status !== INSPECTION_STATUS.COMPLETED) {
    return false;
  }
  if (job.approvedAt) return false;
  if (job.completedAt) return isAfterApprovalGoLive(job.completedAt);
  if (job.createdAt) return isAfterApprovalGoLive(job.createdAt);
  return false;
}
