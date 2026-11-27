import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import {
  isoDateAddDays,
  resolveCurrentTenancyLeaseEnd,
  resolveRentIncreaseLimits,
  type RentIncreaseLimits,
} from '@/lib/rent-review/scheduling';

/** Current tenancy is a fixed-term lease (not periodic). */
export function isCurrentTenancyFixed(detail: RentReviewWorkflowDetail): boolean {
  return detail.leaseType === 'fixed';
}

/** Resolve the current tenancy lease end, putting a short stored end back onto its fixed term. */
export function resolveCurrentLeaseEnd(detail: RentReviewWorkflowDetail): string | null {
  return (
    limitsForRentReview(detail).leaseEndDate ??
    resolveCurrentTenancyLeaseEnd({
      leaseEndDate: detail.leaseEndDate,
      termAnchor: detail.initialLeaseStartDate,
      termWeeks: detail.fixedTermWeeks,
    })
  );
}

/**
 * Day after the current fixed lease ends.
 * Not applicable while the tenant remains on a periodic agreement.
 */
export function deriveNewLeaseStartDate(detail: RentReviewWorkflowDetail): string | null {
  if (!isCurrentTenancyFixed(detail)) return null;
  const leaseEnd = resolveCurrentLeaseEnd(detail);
  if (!leaseEnd) return null;
  return isoDateAddDays(leaseEnd, 1);
}

/** Dates the agent decision and notice forms are allowed to offer. */
export function limitsForRentReview(
  detail: RentReviewWorkflowDetail,
  property?: {
    leaseStart?: string | null;
    leaseEnd?: string | null;
    lastRentIncrease?: string | null;
  } | null,
  servedOn?: string | null,
): RentIncreaseLimits {
  return resolveRentIncreaseLimits({
    servedOn,
    leaseEndDate: detail.leaseEndDate ?? property?.leaseEnd,
    agreementEnd: property?.leaseEnd,
    tenancyStartedOn: property?.leaseStart,
    initialLeaseStartDate: detail.initialLeaseStartDate,
    termWeeks: detail.fixedTermWeeks,
    lastRentIncreaseAt: property?.lastRentIncrease,
    storedEffectiveDate: detail.effectiveDate,
  });
}

/** Suggested payable-from day: term end, 12-month floor, and 60 days' notice. */
export function deriveRentIncreaseOnDate(
  detail: RentReviewWorkflowDetail,
  property?: {
    leaseStart?: string | null;
    leaseEnd?: string | null;
    lastRentIncrease?: string | null;
  } | null,
): string {
  return limitsForRentReview(detail, property).payableFrom;
}
