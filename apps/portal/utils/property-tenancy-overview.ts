import type { PropertyRentPeriod } from '@/constants/property-profile-edit';
import {
  RENT_PERIOD_WEEKS,
  RENT_REVIEW_ACCEPTED_STATES,
  TENANCY_CASE_TYPE,
  TENANCY_LEASE_TERM_TYPE,
  TERMINATION_CASE_CLOSED_PATTERN,
  type TenancyLeaseTermType,
} from '@/constants/property-tenancies';
import type {
  PropertyTenancyCase,
  PropertyTenancyOverview,
} from '@/lib/crossub-api/agent-tenancy-client';
import {
  dayKey,
  dayKeyOf,
  isPeriodicTenancy,
  resolveOverviewLeaseTerm,
  type LeaseTerm,
} from '@/utils/current-tenancy';
import type { PropertyTenancyGroup } from '@/utils/property-tenancy-groups';

/**
 * What the Self-Manage Overview Tenancy card prints, ported from the admin Overview tab
 * (`property-overview-tab.tsx` and `property-portal-utils.ts`).
 */

const VACATE_SUMMARY_PATTERN = /Vacate date\s+(\S+)/i;
const MOVE_OUT_SUMMARY_PATTERN = /Move-out\s+(\S+)/i;

function isClosedTerminationCase(leasingCase: PropertyTenancyCase): boolean {
  return TERMINATION_CASE_CLOSED_PATTERN.test(leasingCase.status);
}

/** Does this end of lease belong to the household on screen? */
function terminationCaseOnDisplayedTenancy(
  record: PropertyTenancyOverview,
  leasingCase: PropertyTenancyCase,
): boolean {
  const displayed = new Set(record.currentTenancy?.tenancyIds ?? []);
  if (displayed.size === 0) return true;
  if (leasingCase.tenancyAgreementId) return displayed.has(leasingCase.tenancyAgreementId);
  return !record.leasingCases.some(
    (other) =>
      other.type === TENANCY_CASE_TYPE.TERMINATION &&
      Boolean(other.tenancyAgreementId) &&
      !displayed.has(other.tenancyAgreementId ?? ''),
  );
}

/** The open end of lease of the household on screen; it owns their vacate date. */
export function openVacatingCaseForDisplayedTenancy(
  record: PropertyTenancyOverview,
): PropertyTenancyCase | undefined {
  return record.leasingCases.find(
    (leasingCase) =>
      leasingCase.type === TENANCY_CASE_TYPE.TERMINATION &&
      !isClosedTerminationCase(leasingCase) &&
      terminationCaseOnDisplayedTenancy(record, leasingCase),
  );
}

function summaryDay(summary: string | null, pattern: RegExp): string | undefined {
  const match = summary?.match(pattern);
  if (!match?.[1]) return undefined;
  const parsed = Date.parse(match[1]);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString().slice(0, 10);
}

/** The Overview vacate date: the API's first, then a live case's, never the previous tenant's. */
export function resolveTenancyVacateDate(record: PropertyTenancyOverview): string | undefined {
  const fromOverview = dayKey(record.overview.vacateDate);
  if (fromOverview) return fromOverview;

  const leaseStart = dayKey(record.overview.leaseStartDate);
  const leaseEnd = dayKey(record.overview.leaseEndDate);
  const live = (day: string | undefined): string | undefined =>
    day && (!leaseStart || day >= leaseStart) ? day : undefined;
  const replaced = (day: string | undefined): boolean =>
    Boolean(day && leaseStart && leaseEnd && day < leaseStart && day < leaseEnd);

  for (const leasingCase of record.leasingCases) {
    const isTermination = leasingCase.type === TENANCY_CASE_TYPE.TERMINATION;
    if (isTermination && !terminationCaseOnDisplayedTenancy(record, leasingCase)) continue;
    if (isTermination && isClosedTerminationCase(leasingCase)) continue;
    const caseDay = dayKey(leasingCase.vacateDate) ?? undefined;
    if (replaced(caseDay)) continue;
    const fromCase =
      live(caseDay) ??
      live(summaryDay(leasingCase.detailSummary, VACATE_SUMMARY_PATTERN)) ??
      live(summaryDay(leasingCase.detailSummary, MOVE_OUT_SUMMARY_PATTERN));
    if (fromCase) return fromCase;
  }
  return undefined;
}

export interface PendingRentChange {
  newRent: number;
  startDate: string;
}

/** A tenant-accepted rent review whose new rent has not started yet (Sydney calendar). */
export function resolveUpcomingAcceptedRentChange(
  cases: readonly PropertyTenancyCase[],
  currentRent: number | null | undefined,
  today = new Date(),
): PendingRentChange | null {
  const todayKey = dayKeyOf(today);
  const candidates = cases.flatMap((review) => {
    if (review.type !== TENANCY_CASE_TYPE.RENT_REVIEW) return [];
    if (!review.workflowState || !RENT_REVIEW_ACCEPTED_STATES.includes(review.workflowState)) {
      return [];
    }
    const startDate = dayKey(review.effectiveDate);
    if (!startDate || startDate < todayKey) return [];
    const newRent = review.agreedRent ?? review.proposedRent;
    if (!newRent || newRent <= 0) return [];
    if (currentRent != null && currentRent > 0 && Math.abs(newRent - currentRent) < 0.01) return [];
    return [{ newRent, startDate }];
  });
  return candidates.sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
}

/** The current household's term, or the registry's when that is the later, begun term. */
export function resolveCurrentLeaseTerm(
  record: PropertyTenancyOverview,
  current: PropertyTenancyGroup | undefined,
  hasIncoming: boolean,
): LeaseTerm {
  return resolveOverviewLeaseTerm({
    household: current
      ? { leaseStartDate: current.leaseStartDate, leaseEndDate: current.leaseEndDate }
      : null,
    registry: {
      leaseStartDate: record.overview.leaseStartDate ?? undefined,
      leaseEndDate: record.overview.leaseEndDate ?? undefined,
    },
    hasIncomingHousehold: hasIncoming,
  });
}

/** Fixed or periodic, the way the Tenancy card reads it. */
export function resolveLeaseTermType(
  record: PropertyTenancyOverview,
  current: PropertyTenancyGroup | undefined,
  term: LeaseTerm,
): TenancyLeaseTermType | null {
  if (!current) return record.overview.leaseTermType;
  if (isPeriodicTenancy(term)) return TENANCY_LEASE_TERM_TYPE.PERIODIC;
  return term.leaseEndDate ? TENANCY_LEASE_TERM_TYPE.FIXED : TENANCY_LEASE_TERM_TYPE.PERIODIC;
}

/** When the previous fixed term ended: the running term's end on a periodic, else the last past lease's. */
export function resolvePreviousFixedTermEnd(
  record: PropertyTenancyOverview,
  current: PropertyTenancyGroup | undefined,
  termType: TenancyLeaseTermType | null,
  term: LeaseTerm,
): string | undefined {
  const currentIds = new Set(current?.leaseIds ?? []);
  const historyEnd = record.leaseHistory
    .filter((lease) => lease.leaseEndDate && !currentIds.has(lease.id))
    .map((lease) => lease.leaseEndDate as string)
    .sort()
    .at(-1);
  if (termType === TENANCY_LEASE_TERM_TYPE.PERIODIC) {
    return current?.leaseEndDate || term.leaseEndDate || historyEnd;
  }
  return historyEnd;
}

/** Is a calendar day before today at the property? (Next rent review "Check date" flag.) */
export function isPastPropertyDay(value: string | null | undefined, today = new Date()): boolean {
  const day = dayKey(value);
  return day != null && day < dayKeyOf(today);
}

const CENTS = 100;

/** The weekly rent as an amount for the period it was agreed in. */
export function rentAmountForPeriod(weekly: number, period: PropertyRentPeriod): number {
  if (!Number.isFinite(weekly) || weekly <= 0) return 0;
  return Math.round(weekly * RENT_PERIOD_WEEKS[period] * CENTS) / CENTS;
}

/** The weekly rent behind an amount for a period. */
export function weeklyRentFromPeriodAmount(amount: number, period: PropertyRentPeriod): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round((amount / RENT_PERIOD_WEEKS[period]) * CENTS) / CENTS;
}

/** A typed amount as a number; blank is undefined; anything else that is not a number throws. */
export function parseAmountInput(value: string): number | undefined {
  const trimmed = value.trim().replace(/[$,]/g, '');
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) throw new Error(`"${value.trim()}" is not an amount`);
  return n;
}
