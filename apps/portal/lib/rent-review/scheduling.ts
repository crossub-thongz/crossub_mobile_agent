/**
 * Rent-review scheduling mirrors `crossub_web/apps/web/modules/rent-review/rent-review-lease-helpers.ts`.
 *
 * - Orders are placed ~90 days before lease end / review due.
 * - Tenants require 60-day advance notice before a rent increase.
 * - That leaves a 30-day window to complete the rent review (90 − 60).
 */

export const RENT_REVIEW_ADVANCE_ORDER_DAYS = 90;
export const RENT_REVIEW_STATUTORY_NOTICE_DAYS = 60;
export const RENT_REVIEW_CONDUCT_WINDOW_DAYS =
  RENT_REVIEW_ADVANCE_ORDER_DAYS - RENT_REVIEW_STATUTORY_NOTICE_DAYS;

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

export interface RentReviewSchedulingFields {
  scheduleAnchor: string;
  advanceReviewOpensOn: string;
  /** Last day to finish review & issue 60-day notice. */
  noticeDeadlineOn: string;
}

export function deriveRentReviewScheduling(input: {
  leaseStart?: string;
  leaseEnd?: string;
  reviewDue?: string;
  leaseType?: 'fixed' | 'periodic';
  fixedTermWeeks?: number;
  createdAt?: string;
}): RentReviewSchedulingFields | null {
  const leaseStart = input.leaseStart?.trim() || null;
  const reviewDue = input.reviewDue?.trim() || null;
  const createdDay = input.createdAt?.slice(0, 10) ?? null;

  let scheduleAnchor: string | null = input.leaseEnd?.trim() || null;

  if (!scheduleAnchor && input.leaseType === 'fixed' && leaseStart && input.fixedTermWeeks) {
    scheduleAnchor = leaseEndFromFixedTermWeeks(leaseStart, input.fixedTermWeeks);
  }

  if (!scheduleAnchor && reviewDue) {
    scheduleAnchor = reviewDue;
  }

  if (!scheduleAnchor && leaseStart) {
    scheduleAnchor = isoDateAddYears(leaseStart, 1);
  }

  if (!scheduleAnchor && createdDay) {
    scheduleAnchor = isoDateAddYears(createdDay, 1);
  }

  if (!scheduleAnchor) return null;

  return {
    scheduleAnchor,
    advanceReviewOpensOn: isoDateSubtractDays(scheduleAnchor, RENT_REVIEW_ADVANCE_ORDER_DAYS),
    noticeDeadlineOn: isoDateSubtractDays(scheduleAnchor, RENT_REVIEW_STATUTORY_NOTICE_DAYS),
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
