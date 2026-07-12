import { formatRentReviewTermLabel } from '@/lib/rent-review-lease-helpers';
import { isRentReviewDecided, type RentReviewDecision } from '@/lib/rent-review';
import { isWithinLeasePeriod } from '@/lib/lease-package-data';
import type { LeasingRecord, Property, RentReviewCase } from '@/lib/types';
import { formatCurrency, formatDate, formatLeasePeriodMonthYear } from '@/lib/utils';

export interface RentReviewSummaryRow {
  id: string;
  leasePeriod: string;
  termLabel: string;
  rentLabel: string;
  startDate: string;
  startDateIso: string;
  review: RentReviewCase;
}

function parseTime(iso: string): number {
  return new Date(iso).getTime();
}

function formatLeasePeriod(start?: string, end?: string): string {
  if (!start && !end) return '—';
  if (start && end) return formatLeasePeriodMonthYear(start, end);
  if (start) return `${formatDate(start)} – —`;
  return `— – ${formatDate(end!)}`;
}

function resolveLeasePeriod(
  review: RentReviewCase,
  property: Property,
  leasingRecords: LeasingRecord[],
  currentLease?: LeasingRecord,
): string {
  if (review.leaseStart || review.leaseEnd) {
    return formatLeasePeriod(review.leaseStart, review.leaseEnd);
  }

  const anchor = review.dateStarted ?? review.reviewDue ?? review.createdAt;
  if (anchor) {
    const matchingLease = leasingRecords.find((lease) => isWithinLeasePeriod(anchor, lease));
    if (matchingLease) {
      return formatLeasePeriod(matchingLease.leaseStart, matchingLease.leaseEnd);
    }
  }

  if (currentLease?.leaseStart || currentLease?.leaseEnd) {
    return formatLeasePeriod(currentLease.leaseStart, currentLease.leaseEnd);
  }

  return formatLeasePeriod(property.leaseStart, property.leaseEnd);
}

/** When the reviewed / new weekly rent takes effect — `newRentStartsFrom` only. */
export function resolveNewRentStartDate(review: RentReviewCase): string | null {
  return review.dateStarted ?? null;
}

function resolveHistoryRentAmount(
  review: RentReviewCase,
  decision?: RentReviewDecision | null,
): number | null {
  if (decision?.action === 'custom' && decision.amount != null && decision.amount > 0) {
    return decision.amount;
  }
  if (review.agreedRent != null && review.agreedRent > 0) return review.agreedRent;
  if (decision?.action === 'confirmed' && review.suggestedRent > 0) return review.suggestedRent;
  if (review.suggestedRent > 0) return review.suggestedRent;
  return null;
}

function resolveCurrentRentAmount(
  review: RentReviewCase,
  decision?: RentReviewDecision | null,
): number | null {
  if (decision?.action === 'custom' && decision.amount != null && decision.amount > 0) {
    return decision.amount;
  }
  if (review.suggestedRent > 0) return review.suggestedRent;
  if (review.agreedRent != null && review.agreedRent > 0) return review.agreedRent;
  if (review.currentRent > 0) return review.currentRent;
  return null;
}

export function isActiveRentReview(
  review: RentReviewCase,
  decision?: RentReviewDecision | null,
): boolean {
  if (isDeletedRentReview(review)) return false;
  if (isRentReviewDecided(review, decision)) return false;
  if (
    review.workflowState === 'COMPLETED' ||
    review.workflowState === 'CANCELLED' ||
    review.workflowState === 'POSTPONED'
  ) {
    return false;
  }
  const status = review.status.toLowerCase();
  return !status.includes('completed') && !status.includes('cancelled');
}

export function isDeletedRentReview(review: RentReviewCase): boolean {
  return (
    review.workflowState === 'CANCELLED' ||
    review.status.toLowerCase().includes('cancelled')
  );
}

export function findCurrentRentReview(
  reviews: RentReviewCase[],
  decisions?: Record<string, RentReviewDecision | null | undefined>,
): RentReviewCase | null {
  const active = reviews.filter((review) =>
    isActiveRentReview(review, decisions?.[review.id]),
  );
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    const aTime = parseTime(a.createdAt ?? a.reviewDue);
    const bTime = parseTime(b.createdAt ?? b.reviewDue);
    return bTime - aTime;
  })[0];
}

type RentReviewRowOptions = {
  property: Property;
  leasingRecords: LeasingRecord[];
  currentLease?: LeasingRecord;
  rentReviewDecisions?: Record<string, RentReviewDecision | null | undefined>;
};

function buildRentReviewRow(
  review: RentReviewCase,
  options: RentReviewRowOptions,
  mode: 'current' | 'history',
): RentReviewSummaryRow {
  const decision = options.rentReviewDecisions?.[review.id];
  const startDateIso = resolveNewRentStartDate(review);
  const rentAmount =
    mode === 'current'
      ? resolveCurrentRentAmount(review, decision)
      : resolveHistoryRentAmount(review, decision);

  return {
    id: review.id,
    leasePeriod: resolveLeasePeriod(
      review,
      options.property,
      options.leasingRecords,
      options.currentLease,
    ),
    termLabel: formatRentReviewTermLabel(review.leaseType, review.fixedTermWeeks),
    rentLabel: rentAmount != null ? `${formatCurrency(rentAmount)}/wk` : '—',
    startDate: startDateIso ? formatDate(startDateIso) : '—',
    startDateIso: startDateIso ?? '',
    review,
  };
}

export function buildCurrentRentReviewRow(
  review: RentReviewCase,
  options: RentReviewRowOptions,
): RentReviewSummaryRow {
  return buildRentReviewRow(review, options, 'current');
}

export function buildRentReviewHistoryRows(
  reviews: RentReviewCase[],
  options: RentReviewRowOptions,
): RentReviewSummaryRow[] {
  return reviews
    .filter(
      (review) =>
        !isDeletedRentReview(review) &&
        !isActiveRentReview(review, options.rentReviewDecisions?.[review.id]),
    )
    .map((review) => buildRentReviewRow(review, options, 'history'))
    .sort((a, b) => parseTime(b.startDateIso) - parseTime(a.startDateIso));
}
