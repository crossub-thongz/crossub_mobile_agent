/**
 * Rent-review scheduling:
 *
 * - Countdown opens 90 days before the rent increase date.
 * - Tenants require 60-day advance notice before a rent increase.
 * - That leaves a 30-day agent conduct window (90 − 60).
 * - Agent due date is 30 days before the new lease start (separate helper).
 */

export const RENT_REVIEW_ADVANCE_ORDER_DAYS = 90;
export const RENT_REVIEW_STATUTORY_NOTICE_DAYS = 60;
export const RENT_REVIEW_CONDUCT_WINDOW_DAYS =
  RENT_REVIEW_ADVANCE_ORDER_DAYS - RENT_REVIEW_STATUTORY_NOTICE_DAYS;
/** Agent due date — 30 days before the new lease start. */
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

/** Day after the current tenancy lease ends. */
export function deriveNewLeaseStartFromTenancyEnd(tenancyLeaseEnd: string): string {
  return isoDateAddDays(tenancyLeaseEnd, 1);
}

/** Agent due date — 30 days before the new lease start. */
export function deriveRentReviewDueDate(tenancyLeaseEnd: string): string {
  return isoDateSubtractDays(
    deriveNewLeaseStartFromTenancyEnd(tenancyLeaseEnd),
    RENT_REVIEW_DUE_DAYS_BEFORE_NEW_LEASE,
  );
}

export function deriveRentReviewDueDateFromInput(input: {
  leaseEndDate?: string | null;
  leaseEnd?: string | null;
  agreementEnd?: string | null;
  termAnchor?: string | null;
  termWeeks?: number | null;
  /** Persisted due date when tenancy lease end is unavailable. */
  reviewDue?: string | null;
  /** Preferred / new lease start — due date is 30 days before this. */
  newLeaseStart?: string | null;
}): string | null {
  const tenancyLeaseEnd = resolveCurrentTenancyLeaseEnd(input);
  if (tenancyLeaseEnd) return deriveRentReviewDueDate(tenancyLeaseEnd);

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
  leaseEnd?: string;
  leaseEndDate?: string;
  newLeaseStart?: string;
  createdAt?: string;
}): RentReviewSchedulingFields | null {
  const createdDay = input.createdAt?.slice(0, 10) ?? null;

  const rentIncreaseDate = resolveRentIncreaseDate({
    rentIncreaseDate: input.rentIncreaseDate,
    leaseEndDate: input.leaseEndDate,
    leaseEnd: input.leaseEnd,
    newLeaseStart: input.newLeaseStart,
  });

  let scheduleAnchor = rentIncreaseDate;

  if (!scheduleAnchor && createdDay) {
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
