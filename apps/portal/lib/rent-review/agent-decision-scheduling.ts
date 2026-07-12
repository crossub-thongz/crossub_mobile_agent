import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import {
  deriveRentReviewScheduling,
  isoDateAddDays,
  leaseEndFromFixedTermWeeks,
  RENT_REVIEW_STATUTORY_NOTICE_DAYS,
  toDateOnly,
} from '@/lib/rent-review/scheduling';

/** Resolve the current tenancy lease end from stored or derived fields. */
export function resolveCurrentLeaseEnd(detail: RentReviewWorkflowDetail): string | null {
  if (detail.leaseEndDate) return toDateOnly(detail.leaseEndDate);
  if (
    detail.leaseType === 'fixed' &&
    detail.initialLeaseStartDate &&
    detail.fixedTermWeeks
  ) {
    return leaseEndFromFixedTermWeeks(detail.initialLeaseStartDate, detail.fixedTermWeeks);
  }
  return toDateOnly(detail.rentReviewDate);
}

/** Day after the current fixed lease ends; null for periodic tenancies. */
export function deriveNewLeaseStartDate(detail: RentReviewWorkflowDetail): string | null {
  if (detail.leaseType === 'periodic') return null;
  const leaseEnd = resolveCurrentLeaseEnd(detail);
  if (!leaseEnd) return null;
  return isoDateAddDays(leaseEnd, 1);
}

/**
 * Statutory minimum is 60 days from today; when a lease anchor exists, prefer the
 * later of that minimum and the schedule anchor (typically lease end).
 */
export function deriveRentIncreaseOnDate(detail: RentReviewWorkflowDetail): string {
  const today = new Date().toISOString().slice(0, 10);
  const statutoryMin = isoDateAddDays(today, RENT_REVIEW_STATUTORY_NOTICE_DAYS);
  const leaseEnd = resolveCurrentLeaseEnd(detail);
  const scheduling = deriveRentReviewScheduling({
    leaseStart: detail.initialLeaseStartDate ?? undefined,
    leaseEnd: leaseEnd ?? undefined,
    reviewDue: detail.rentReviewDate ?? undefined,
    leaseType: detail.leaseType ?? undefined,
    fixedTermWeeks: detail.fixedTermWeeks ?? undefined,
    createdAt: detail.createdAt,
  });
  if (!scheduling) return statutoryMin;
  return scheduling.scheduleAnchor >= statutoryMin ? scheduling.scheduleAnchor : statutoryMin;
}
