import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import {
  isoDateAddDays,
  resolveRentIncreaseDate,
  RENT_REVIEW_STATUTORY_NOTICE_DAYS,
} from '@/lib/rent-review/scheduling';

/** Resolve the current tenancy lease end from stored fields. */
export function resolveCurrentLeaseEnd(detail: RentReviewWorkflowDetail): string | null {
  return resolveRentIncreaseDate({
    leaseEndDate: detail.leaseEndDate,
    newLeaseStart: detail.newAgreementStart ?? detail.initialLeaseStartDate,
  });
}

/** Day after the current lease ends. */
export function deriveNewLeaseStartDate(detail: RentReviewWorkflowDetail): string | null {
  const leaseEnd = resolveCurrentLeaseEnd(detail);
  if (!leaseEnd) return null;
  return isoDateAddDays(leaseEnd, 1);
}

/** Same calendar day as the current lease end (one day before the new lease start). */
export function deriveRentIncreaseOnDate(detail: RentReviewWorkflowDetail): string {
  const leaseEnd = resolveCurrentLeaseEnd(detail);
  if (leaseEnd) return leaseEnd;

  const newStart = deriveNewLeaseStartDate(detail);
  if (newStart) return isoDateAddDays(newStart, -1);

  const today = new Date().toISOString().slice(0, 10);
  return isoDateAddDays(today, RENT_REVIEW_STATUTORY_NOTICE_DAYS);
}
