/**
 * Rent-review scheduling:
 *
 * - First review: order opens 90 days before initial lease expiry; rent increase on lease end.
 * - Subsequent reviews: order opens 90 days before the 12-month anniversary of the
 *   previous rent increase; rent increase on that anniversary.
 * - Tenants require 60-day advance notice before a rent increase, counted from the day after
 *   the notice is served.
 * - Agent due date is 30 days before the new lease start (first fixed review) or
 *   30 days before the rent increase (subsequent).
 */

export const RENT_REVIEW_ADVANCE_ORDER_DAYS = 90;
export const RENT_REVIEW_STATUTORY_NOTICE_DAYS = 60;
export const RENT_REVIEW_CONDUCT_WINDOW_DAYS =
  RENT_REVIEW_ADVANCE_ORDER_DAYS - RENT_REVIEW_STATUTORY_NOTICE_DAYS;
/**
 * Calendar days from service to the earliest date an increase may lawfully take effect.
 *
 * The sixty days are counted from the day **after** the notice is served — the day of service
 * is not one of them. Mirrors `RENT_REVIEW_EARLIEST_INCREASE_OFFSET_DAYS` in the API; if the
 * two disagree the picker offers a date the API refuses, which reads to an agent as a broken
 * form rather than as a rule.
 */
export const RENT_REVIEW_EARLIEST_INCREASE_OFFSET_DAYS = RENT_REVIEW_STATUTORY_NOTICE_DAYS + 1;
/** Agent due date — 30 days before the new lease start or rent increase. */
export const RENT_REVIEW_DUE_DAYS_BEFORE_NEW_LEASE = 30;

export function toDateOnly(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function isoDateAddDays(dateStr: string, days: number): string {
  const base = toDateOnly(dateStr) ?? dateStr;
  const d = new Date(`${base}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isoDateSubtractDays(dateStr: string, days: number): string {
  return isoDateAddDays(dateStr, -days);
}

export function isoDateAddYears(dateStr: string, years: number): string {
  const base = toDateOnly(dateStr) ?? dateStr;
  const d = new Date(`${base}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function leaseEndFromFixedTermWeeks(startDate: string, weeks: number): string {
  return isoDateAddDays(startDate, weeks * 7);
}

/**
 * Current tenancy lease end — anchor for rent increase / new lease start and
 * countdown scheduling. Does not use `reviewDue` (that is the agent due date).
 */
export function resolveCurrentTenancyLeaseEnd(input: {
  leaseEndDate?: string | null;
  leaseEnd?: string | null;
  agreementEnd?: string | null;
  termAnchor?: string | null;
  termWeeks?: number | null;
}): string | null {
  const explicit =
    toDateOnly(input.leaseEndDate) ??
    toDateOnly(input.leaseEnd) ??
    toDateOnly(input.agreementEnd);
  if (explicit) return explicit;

  const anchor = toDateOnly(input.termAnchor);
  if (anchor && input.termWeeks != null && input.termWeeks > 0) {
    return leaseEndFromFixedTermWeeks(anchor, input.termWeeks);
  }

  return null;
}

/** Whether this tenancy has had a prior rent increase (subsequent review cycle). */
export function isSubsequentRentReview(lastRentIncreaseAt?: string | null): boolean {
  return toDateOnly(lastRentIncreaseAt) != null;
}

/**
 * When the rent increase for this review cycle should take effect.
 * First review: current tenancy lease end. Subsequent: 12 months after last increase.
 */
export function resolveRentIncreaseAnchor(input: {
  rentIncreaseDate?: string | null;
  effectiveDate?: string | null;
  leaseEndDate?: string | null;
  leaseEnd?: string | null;
  agreementEnd?: string | null;
  termAnchor?: string | null;
  termWeeks?: number | null;
  lastRentIncreaseAt?: string | null;
}): string | null {
  const explicit =
    toDateOnly(input.rentIncreaseDate) ??
    toDateOnly(input.effectiveDate);
  if (explicit) return explicit;

  const lastIncrease = toDateOnly(input.lastRentIncreaseAt);
  if (lastIncrease) {
    return isoDateAddYears(lastIncrease, 1);
  }

  return resolveCurrentTenancyLeaseEnd(input);
}

/** Agent due date from the rent increase anchor. */
export function resolveAgentDueDateFromAnchor(
  rentIncreaseAnchor: string,
  isSubsequentReview: boolean,
): string {
  if (isSubsequentReview) {
    return isoDateSubtractDays(rentIncreaseAnchor, RENT_REVIEW_DUE_DAYS_BEFORE_NEW_LEASE);
  }
  return isoDateSubtractDays(
    deriveNewLeaseStartFromTenancyEnd(rentIncreaseAnchor),
    RENT_REVIEW_DUE_DAYS_BEFORE_NEW_LEASE,
  );
}

/** When the next review order should open after a completed rent increase. */
export function resolveNextRentReviewOpensOn(completedRentIncreaseDate: string): string {
  const anniversary = isoDateAddYears(completedRentIncreaseDate, 1);
  return isoDateSubtractDays(anniversary, RENT_REVIEW_ADVANCE_ORDER_DAYS);
}

/** Day after the current tenancy lease ends. */
export function deriveNewLeaseStartFromTenancyEnd(tenancyLeaseEnd: string): string {
  return isoDateAddDays(tenancyLeaseEnd, 1);
}

/** Agent due date — 30 days before the new lease start (first fixed review). */
export function deriveRentReviewDueDate(tenancyLeaseEnd: string): string {
  return resolveAgentDueDateFromAnchor(tenancyLeaseEnd, false);
}

export function deriveRentReviewDueDateFromInput(input: {
  leaseEndDate?: string | null;
  leaseEnd?: string | null;
  agreementEnd?: string | null;
  termAnchor?: string | null;
  termWeeks?: number | null;
  lastRentIncreaseAt?: string | null;
  /** Persisted due date when tenancy lease end is unavailable. */
  reviewDue?: string | null;
  /** Preferred / new lease start — due date is 30 days before this. */
  newLeaseStart?: string | null;
}): string | null {
  const lastIncrease = toDateOnly(input.lastRentIncreaseAt);
  const rentIncreaseAnchor = resolveRentIncreaseAnchor({
    leaseEndDate: input.leaseEndDate,
    leaseEnd: input.leaseEnd,
    agreementEnd: input.agreementEnd,
    termAnchor: input.termAnchor,
    termWeeks: input.termWeeks,
    lastRentIncreaseAt: input.lastRentIncreaseAt,
  });
  if (rentIncreaseAnchor) {
    return resolveAgentDueDateFromAnchor(rentIncreaseAnchor, lastIncrease != null);
  }

  const newLeaseStart = toDateOnly(input.newLeaseStart);
  if (newLeaseStart) {
    return isoDateSubtractDays(newLeaseStart, RENT_REVIEW_DUE_DAYS_BEFORE_NEW_LEASE);
  }

  return toDateOnly(input.reviewDue);
}

/** Rent increase on — same day as the current tenancy lease ends. */
export function resolveRentIncreaseDate(input: {
  rentIncreaseDate?: string | null;
  leaseEndDate?: string | null;
  leaseEnd?: string | null;
  agreementEnd?: string | null;
  termAnchor?: string | null;
  termWeeks?: number | null;
  /** Preferred / new lease start — rent increase is the day before. */
  newLeaseStart?: string | null;
}): string | null {
  const explicit = toDateOnly(input.rentIncreaseDate);
  if (explicit) return explicit;

  const tenancyLeaseEnd = resolveCurrentTenancyLeaseEnd(input);
  if (tenancyLeaseEnd) return tenancyLeaseEnd;

  const newLeaseStart = toDateOnly(input.newLeaseStart);
  if (newLeaseStart) return isoDateAddDays(newLeaseStart, -1);

  return null;
}

export interface RentReviewSchedulingFields {
  /** Rent increase date — countdown anchor. */
  scheduleAnchor: string;
  /** Rent review order opens (rent increase date − 90 days). */
  advanceReviewOpensOn: string;
  /** Last day to finish review & issue 60-day notice (rent increase date − 60 days). */
  noticeDeadlineOn: string;
}

export function deriveRentReviewScheduling(input: {
  rentIncreaseDate?: string;
  effectiveDate?: string;
  leaseEnd?: string;
  leaseEndDate?: string;
  lastRentIncreaseAt?: string;
  newLeaseStart?: string;
  createdAt?: string;
}): RentReviewSchedulingFields | null {
  const rentIncreaseDate = resolveRentIncreaseAnchor({
    rentIncreaseDate: input.rentIncreaseDate,
    effectiveDate: input.effectiveDate,
    leaseEndDate: input.leaseEndDate,
    leaseEnd: input.leaseEnd,
    lastRentIncreaseAt: input.lastRentIncreaseAt,
    newLeaseStart: input.newLeaseStart,
  });

  let scheduleAnchor = rentIncreaseDate;

  if (!scheduleAnchor && input.createdAt) {
    const createdDay = input.createdAt.slice(0, 10);
    scheduleAnchor = isoDateAddYears(createdDay, 1);
  }

  if (!scheduleAnchor) return null;

  return {
    scheduleAnchor,
    advanceReviewOpensOn: isoDateSubtractDays(
      scheduleAnchor,
      RENT_REVIEW_ADVANCE_ORDER_DAYS,
    ),
    noticeDeadlineOn: isoDateSubtractDays(
      scheduleAnchor,
      RENT_REVIEW_STATUTORY_NOTICE_DAYS,
    ),
  };
}

/** Calendar days from today until `targetIso` (YYYY-MM-DD); negative if past. */
export function calendarDaysUntil(
  targetIso: string | null | undefined,
  reference = new Date(),
): number | null {
  if (!targetIso) return null;
  const end = new Date(`${targetIso}T12:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Earliest date a rent increase may lawfully take effect for a notice served on `servedOn`.
 * Use it for the `min` on any picker that sets an increase date, so the rule shows up while
 * the agent is choosing rather than as a rejected save afterwards.
 */
export function earliestCompliantRentIncreaseDate(servedOn?: string | null): string {
  const served = toDateOnly(servedOn ?? null) ?? new Date().toISOString().slice(0, 10);
  return isoDateAddDays(served, RENT_REVIEW_EARLIEST_INCREASE_OFFSET_DAYS);
}

/** NSW notice "Payable from" — mirrors backend scheduling util. */
export function resolveNoticePayableFromDate(input: {
  suppliedOn?: string | null;
  leaseEndDate?: string | null;
  lastRentIncreaseAt?: string | null;
  explicitPayableFrom?: string | null;
  storedEffectiveDate?: string | null;
}): string {
  const supplied = toDateOnly(input.suppliedOn) ?? new Date().toISOString().slice(0, 10);
  const statutoryMin = earliestCompliantRentIncreaseDate(supplied);

  const override =
    toDateOnly(input.explicitPayableFrom) ?? toDateOnly(input.storedEffectiveDate);
  if (override) {
    return override >= statutoryMin ? override : statutoryMin;
  }

  const leaseEnd = toDateOnly(input.leaseEndDate);
  const lastIncrease = toDateOnly(input.lastRentIncreaseAt);
  let anchor: string | null = null;
  if (lastIncrease) {
    anchor = isoDateAddYears(lastIncrease, 1);
  } else if (leaseEnd) {
    anchor = leaseEnd;
  }

  if (anchor) {
    return anchor >= statutoryMin ? anchor : statutoryMin;
  }

  return statutoryMin;
}
