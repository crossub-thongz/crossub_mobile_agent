/**
 * Rent-review scheduling:
 *
 * - First review: order opens 90 days before the first lawful increase. That day is the
 *   later of the fixed-term end and 12 months after the tenancy started.
 * - Subsequent reviews: order opens 90 days before the 12-month anniversary of the
 *   previous rent increase; rent increase on that anniversary.
 * - NSW allows one increase in any 12-month period, counted from the tenancy start when
 *   none is on record, otherwise from the last increase. A 52-week term ends before that
 *   anniversary, so the increase waits for the anniversary.
 * - Tenants require 60-day advance notice before a rent increase, counted from the day after
 *   the notice is served. The date offered to an agent is the later of that notice floor
 *   and the 12-month floor.
 * - Agent due date is 30 days before the new lease start (first fixed review) or
 *   30 days before the rent increase (subsequent, or a first review held for 12 months).
 */

export const RENT_REVIEW_ADVANCE_ORDER_DAYS = 90;
export const RENT_REVIEW_STATUTORY_NOTICE_DAYS = 60;
export const RENT_REVIEW_CONDUCT_WINDOW_DAYS =
  RENT_REVIEW_ADVANCE_ORDER_DAYS - RENT_REVIEW_STATUTORY_NOTICE_DAYS;
/**
 * Calendar days from service to the earliest date an increase may lawfully take effect.
 *
 * Sixty full days counted from the day **after** service, and the increase takes effect on
 * day 61 — a notice served 7 Oct runs day 1 on the 8th, day 60 on 6 Dec, and the rent may rise
 * on 7 Dec (Daniel Zhou, 7 Oct 2026, a compliance fix reversing CRS-0126's service + 60).
 *
 * Mirrors `RENT_REVIEW_EARLIEST_INCREASE_OFFSET_DAYS` in the API; if the two disagree the
 * picker offers a date the API refuses, which reads to an agent as a broken form rather than
 * as a rule.
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
 * Last day of a fixed term as written on an NSW agreement: start plus N weeks, ending the
 * day before that anniversary. 15 Jun 2026 for 52 weeks ends 13 Jun 2027.
 */
export function inclusiveFixedTermEnd(startDate: string, weeks: number): string {
  return isoDateAddDays(startDate, weeks * 7 - 1);
}

function laterDate(a: string | null, b: string | null): string | null {
  if (a && b) return a >= b ? a : b;
  return a ?? b;
}

/**
 * Tenancy commencement. A date after the recorded end is a renewal start, not the
 * start the 12-month count runs from.
 */
export function resolveTenancyCommencement(input: {
  leaseStart?: string | null;
  initialLeaseStartDate?: string | null;
  leaseEndDate?: string | null;
}): string | null {
  const end = toDateOnly(input.leaseEndDate);
  const candidates = [toDateOnly(input.leaseStart), toDateOnly(input.initialLeaseStartDate)];
  for (const start of candidates) {
    if (!start) continue;
    if (end && start > end) continue;
    return start;
  }
  return null;
}

/**
 * NSW: one rent increase in any 12-month period. The period starts on the last increase,
 * or on the tenancy start when none is recorded.
 */
export function resolveTwelveMonthIncreaseFloor(input: {
  tenancyStartedOn?: string | null;
  lastRentIncreaseAt?: string | null;
}): string | null {
  const lastIncrease = toDateOnly(input.lastRentIncreaseAt);
  if (lastIncrease) return isoDateAddYears(lastIncrease, 1);
  const started = toDateOnly(input.tenancyStartedOn);
  if (started) return isoDateAddYears(started, 1);
  return null;
}

/**
 * Fixed-term end used for scheduling. A stored end that falls well before the term
 * written as N weeks from the tenancy start is not that term's end — a 52-week lease
 * from 15 Jun 2026 cannot end on 10 Jan 2027 — so the term end is used instead.
 * An end within two weeks of the term (either the inclusive or exclusive convention)
 * is kept as recorded.
 */
export function reconcileFixedTermLeaseEnd(input: {
  leaseEndDate?: string | null;
  tenancyStartedOn?: string | null;
  termWeeks?: number | null;
}): string | null {
  const explicit = toDateOnly(input.leaseEndDate);
  const start = toDateOnly(input.tenancyStartedOn);
  const weeks = input.termWeeks;
  if (!start || weeks == null || weeks <= 0) return explicit;

  const termEnd = inclusiveFixedTermEnd(start, weeks);
  const exclusiveEnd = leaseEndFromFixedTermWeeks(start, weeks);
  if (!explicit) return termEnd;
  if (explicit >= isoDateAddDays(termEnd, -14) && explicit <= isoDateAddDays(exclusiveEnd, 14)) {
    return explicit;
  }
  if (explicit < isoDateAddDays(termEnd, -14)) return termEnd;
  return explicit;
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
 * An explicit date is returned as stored. Otherwise the day is the later of the
 * tenancy end and the 12-month floor (last increase, or the tenancy start when none
 * is on record).
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
  tenancyStartedOn?: string | null;
  // Forwarded whole to resolveCurrentTenancyLeaseEnd below, which anchors on it
  // (tenancy end = the day before the new lease starts). The value was already reaching
  // that function at runtime — only this declaration omitted it.
  newLeaseStart?: string | null;
}): string | null {
  const explicit =
    toDateOnly(input.rentIncreaseDate) ??
    toDateOnly(input.effectiveDate);
  if (explicit) return explicit;

  const started =
    toDateOnly(input.tenancyStartedOn) ??
    resolveTenancyCommencement({
      leaseStart: input.termAnchor,
      leaseEndDate: input.leaseEndDate ?? input.leaseEnd ?? input.agreementEnd,
    });
  const floor = resolveTwelveMonthIncreaseFloor({
    tenancyStartedOn: started,
    lastRentIncreaseAt: input.lastRentIncreaseAt,
  });
  const lastIncrease = toDateOnly(input.lastRentIncreaseAt);
  if (lastIncrease) return floor;

  const leaseEnd = reconcileFixedTermLeaseEnd({
    leaseEndDate:
      toDateOnly(input.leaseEndDate) ??
      toDateOnly(input.leaseEnd) ??
      toDateOnly(input.agreementEnd) ??
      resolveCurrentTenancyLeaseEnd(input),
    tenancyStartedOn: started,
    termWeeks: input.termWeeks,
  });
  return laterDate(leaseEnd, floor);
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
  const limits = resolveRentIncreaseLimits({
    leaseEndDate: input.leaseEndDate ?? input.leaseEnd,
    agreementEnd: input.agreementEnd,
    tenancyStartedOn: input.termAnchor,
    termWeeks: input.termWeeks,
    lastRentIncreaseAt: input.lastRentIncreaseAt,
  });
  if (limits.scheduleAnchor) {
    const heldPastLeaseEnd =
      limits.twelveMonthFloor != null &&
      limits.leaseEndDate != null &&
      limits.twelveMonthFloor > limits.leaseEndDate;
    return resolveAgentDueDateFromAnchor(
      limits.scheduleAnchor,
      lastIncrease != null || heldPastLeaseEnd,
    );
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
  /** Last day to issue the 60-day notice and still land the increase (rent increase date − 61 days). */
  noticeDeadlineOn: string;
}

export function deriveRentReviewScheduling(input: {
  rentIncreaseDate?: string;
  effectiveDate?: string;
  leaseEnd?: string;
  leaseEndDate?: string;
  lastRentIncreaseAt?: string;
  tenancyStartedOn?: string;
  termWeeks?: number | null;
  newLeaseStart?: string;
  createdAt?: string;
}): RentReviewSchedulingFields | null {
  const limits = resolveRentIncreaseLimits({
    leaseEndDate: input.leaseEndDate ?? input.leaseEnd,
    tenancyStartedOn: input.tenancyStartedOn,
    termWeeks: input.termWeeks,
    lastRentIncreaseAt: input.lastRentIncreaseAt,
    storedEffectiveDate: input.rentIncreaseDate ?? input.effectiveDate,
  });
  const rentIncreaseDate = limits.scheduleAnchor;

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
      RENT_REVIEW_EARLIEST_INCREASE_OFFSET_DAYS,
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

export interface RentIncreaseLimits {
  /** Day the 12-month count runs from, when known. */
  tenancyStartedOn: string | null;
  /** End date as stored, before a short fixed term is put back on its weeks. */
  storedLeaseEnd: string | null;
  /** End date scheduling uses. */
  leaseEndDate: string | null;
  /** First day a further increase is allowed. Null when no start or last increase is known. */
  twelveMonthFloor: string | null;
  /**
   * Increase day before the 60-day notice is applied. The later of the term end and the
   * 12-month floor. Null when neither is known.
   */
  scheduleAnchor: string | null;
  /** Earliest day the picker may offer, including 60 days' notice. */
  earliestDate: string;
  /** Suggested payable-from: the later of the schedule anchor and the notice floor. */
  payableFrom: string;
  /** The 12-month rule, rather than the 60-day notice alone, sets `earliestDate`. */
  heldByTwelveMonthRule: boolean;
  /** Stored end was earlier than the fixed term and was replaced. */
  leaseEndCorrected: boolean;
}

/**
 * Lawful increase dates for one tenancy.
 *
 * `scheduleAnchor` ignores today's notice clock so a review opened early still counts
 * down to the real increase. `earliestDate` and `payableFrom` include the 60-day notice,
 * so a form cannot offer a day inside either rule.
 */
export function resolveRentIncreaseLimits(input: {
  servedOn?: string | null;
  leaseEndDate?: string | null;
  agreementEnd?: string | null;
  tenancyStartedOn?: string | null;
  initialLeaseStartDate?: string | null;
  termWeeks?: number | null;
  lastRentIncreaseAt?: string | null;
  /** A date already chosen. Kept when it is lawful; lifted to the floor when it is not. */
  storedEffectiveDate?: string | null;
}): RentIncreaseLimits {
  const storedLeaseEnd = laterDate(
    toDateOnly(input.leaseEndDate),
    toDateOnly(input.agreementEnd),
  );
  const tenancyStartedOn = resolveTenancyCommencement({
    leaseStart: input.tenancyStartedOn,
    initialLeaseStartDate: input.initialLeaseStartDate,
    leaseEndDate: storedLeaseEnd,
  });
  const leaseEndDate = reconcileFixedTermLeaseEnd({
    leaseEndDate: storedLeaseEnd,
    tenancyStartedOn,
    termWeeks: input.termWeeks,
  });
  const twelveMonthFloor = resolveTwelveMonthIncreaseFloor({
    tenancyStartedOn,
    lastRentIncreaseAt: input.lastRentIncreaseAt,
  });
  // A recorded increase keeps the next one on its anniversary. The first increase
  // waits for both the fixed term and twelve months from the day the tenancy started.
  const scheduleAnchor = toDateOnly(input.lastRentIncreaseAt)
    ? twelveMonthFloor
    : laterDate(leaseEndDate, twelveMonthFloor);
  const statutoryMin = earliestCompliantRentIncreaseDate(input.servedOn);
  const earliestDate = laterDate(statutoryMin, twelveMonthFloor) ?? statutoryMin;
  const stored = toDateOnly(input.storedEffectiveDate);
  const payableFrom =
    stored && stored >= earliestDate
      ? laterDate(stored, scheduleAnchor) ?? stored
      : laterDate(scheduleAnchor, earliestDate) ?? earliestDate;

  return {
    tenancyStartedOn,
    storedLeaseEnd,
    leaseEndDate,
    twelveMonthFloor,
    scheduleAnchor,
    earliestDate,
    payableFrom,
    heldByTwelveMonthRule: twelveMonthFloor != null && earliestDate === twelveMonthFloor && twelveMonthFloor > statutoryMin,
    leaseEndCorrected: storedLeaseEnd != null && leaseEndDate != null && storedLeaseEnd < leaseEndDate,
  };
}

/** NSW notice "Payable from" — the later of the term, the 12-month floor, and 60 days' notice. */
export function resolveNoticePayableFromDate(input: {
  suppliedOn?: string | null;
  leaseEndDate?: string | null;
  agreementEnd?: string | null;
  tenancyStartedOn?: string | null;
  initialLeaseStartDate?: string | null;
  termWeeks?: number | null;
  lastRentIncreaseAt?: string | null;
  explicitPayableFrom?: string | null;
  storedEffectiveDate?: string | null;
}): string {
  return resolveRentIncreaseLimits({
    servedOn: input.suppliedOn,
    leaseEndDate: input.leaseEndDate,
    agreementEnd: input.agreementEnd,
    tenancyStartedOn: input.tenancyStartedOn,
    initialLeaseStartDate: input.initialLeaseStartDate,
    termWeeks: input.termWeeks,
    lastRentIncreaseAt: input.lastRentIncreaseAt,
    storedEffectiveDate: input.explicitPayableFrom ?? input.storedEffectiveDate,
  }).payableFrom;
}
