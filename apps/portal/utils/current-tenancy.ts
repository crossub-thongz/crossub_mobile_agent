import {
  TENANCY_LEASE_RUNNING_STATUSES,
  TENANCY_LEASE_STATUS,
  TENANCY_PLACEHOLDER,
} from '@/constants/property-tenancies';
import { PROPERTY_TIME_ZONE } from '@/constants/time-zone';

/**
 * Which of a property's tenancies is the CURRENT one: a port of `crossub_web/apps/web/utils/current-tenancy.ts`
 * (the API's supersession rule). The API ships its own answer as `currentTenancy.tenancyIds` /
 * `incomingTenancyIds`, which these prefer whenever they name rows we hold. Expiry never ends a
 * tenancy: an NSW fixed term that runs out continues as a periodic tenancy (RTA 2010 s 18).
 */

/** The fields the rule needs. Structural so lease rows and tests can both pass one. */
export interface TenancyTermRow {
  id?: string;
  status?: string | null;
  /** ISO day, or blank when not recorded. */
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const PROPERTY_DAY_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: PROPERTY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today (or `date`) as an ISO day at the property (Sydney). */
export function dayKeyOf(date: Date): string {
  const parts = PROPERTY_DAY_PARTS.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function dayKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === TENANCY_PLACEHOLDER) return null;
  const day = trimmed.slice(0, 10);
  return ISO_DAY.test(day) ? day : null;
}

/** Is somebody still living under this tenancy, as far as its status is concerned? */
export function isTenancyStatusLive(row: TenancyTermRow): boolean {
  if (row.status == null) return true;
  return (TENANCY_LEASE_RUNNING_STATUSES as readonly string[]).includes(row.status);
}

export function isTenancyEnded(row: TenancyTermRow): boolean {
  return row.status === TENANCY_LEASE_STATUS.ENDED;
}

/** The day a tenancy finishes; null when not usable (none, or before its own start). */
function tenancyEndsOn(row: TenancyTermRow): string | null {
  const ends = dayKey(row.leaseEndDate);
  if (!ends) return null;
  const begins = dayKey(row.leaseStartDate);
  if (begins && ends < begins) return null;
  return ends;
}

/** Does `successor` take over from `row` — a later tenancy beginning once `row`'s term is done? */
function supersedes(row: TenancyTermRow, successor: TenancyTermRow): boolean {
  const ends = tenancyEndsOn(row);
  const begins = dayKey(successor.leaseStartDate);
  const rowBegan = dayKey(row.leaseStartDate);
  if (!ends || !begins || !rowBegan) return false;
  return begins > rowBegan && begins >= ends;
}

export function isTenancySuperseded(row: TenancyTermRow, all: readonly TenancyTermRow[]): boolean {
  if (!isTenancyStatusLive(row)) return false;
  return all.some(
    (candidate) => candidate !== row && isTenancyStatusLive(candidate) && supersedes(row, candidate),
  );
}

/** The pinned tenancy and the rest of the household sitting in the same place in the sequence. */
export function selectPinnedTenancies<T extends TenancyTermRow>(
  rows: readonly T[],
  pinnedTenancyId: string | null | undefined,
): T[] | null {
  const pinned = pinnedTenancyId?.trim();
  if (!pinned) return null;
  const live = rows.filter(isTenancyStatusLive);
  const anchor = live.find((row) => row.id === pinned);
  if (!anchor) return null;
  return live.filter(
    (row) => row === anchor || (!supersedes(anchor, row) && !supersedes(row, anchor)),
  );
}

/** The property's current tenancies: the API's ids, else the pin, else every live row not superseded. */
export function selectCurrentTenancies<T extends TenancyTermRow>(
  rows: readonly T[],
  options?: { pinnedTenancyId?: string | null; currentTenancyIds?: readonly string[] },
): T[] {
  const fromApi = options?.currentTenancyIds;
  if (fromApi && fromApi.length > 0) {
    const matched = rows.filter((row) => row.id != null && fromApi.includes(row.id));
    if (matched.length > 0) return matched;
  }
  const pinned = selectPinnedTenancies(rows, options?.pinnedTenancyId);
  if (pinned && pinned.length > 0) return pinned;
  const live = rows.filter(isTenancyStatusLive);
  const current = live.filter((row) => !isTenancySuperseded(row, live));
  return current.length > 0 ? current : live;
}

/** Of the current tenancies, which household has started and which is incoming. */
export function splitIncomingTenancies<T extends TenancyTermRow>(
  current: readonly T[],
  all: readonly T[],
  options?: { incomingTenancyIds?: readonly string[] },
  today = new Date(),
): { current: T[]; incoming: T[] } {
  const todayKey = dayKeyOf(today);
  const isFuture = (row: T): boolean => {
    const begins = dayKey(row.leaseStartDate);
    return begins != null && begins > todayKey;
  };
  const live = all.filter(isTenancyStatusLive);
  const apiIncomingIds = options?.incomingTenancyIds;
  const apiDecided = apiIncomingIds != null;
  const incoming = apiDecided
    ? live.filter((row) => row.id != null && apiIncomingIds.includes(row.id))
    : live.filter((row) => isFuture(row) && !isTenancySuperseded(row, live));
  const isIncoming = (row: T): boolean => incoming.includes(row) || (!apiDecided && isFuture(row));
  const started = current.filter((row) => !isIncoming(row));
  if (started.length > 0) return { current: started, incoming };
  if (incoming.length === 0) return { current: [...current], incoming: [] };
  const begun = live.filter((row) => !isIncoming(row));
  return { current: begun.filter((row) => !isTenancySuperseded(row, begun)), incoming };
}

/** Has this tenancy run past a recorded fixed term without anyone ending it? */
export function isPeriodicTenancy(row: TenancyTermRow, today = new Date()): boolean {
  const ends = tenancyEndsOn(row);
  if (!ends) return false;
  return ends < dayKeyOf(today);
}

/** Has a recorded move-out date already passed (strictly later than the vacate day)? */
export function hasMovedOut(moveOutDate: string | null | undefined, today = new Date()): boolean {
  const day = dayKey(moveOutDate);
  if (!day) return false;
  return day < dayKeyOf(today);
}

/** A lease term as the cards print it — ISO days, either side may be blank. */
export interface LeaseTerm {
  leaseStartDate?: string;
  leaseEndDate?: string;
}

/**
 * Which lease term the cards show: the current household's agreement, or the property's registry
 * term when that is a later begun term for the same household, or a correction inside it. Port of
 * `resolveOverviewLeaseTerm` in the admin web.
 */
export function resolveOverviewLeaseTerm(args: {
  household: LeaseTerm | null | undefined;
  registry: LeaseTerm;
  hasIncomingHousehold: boolean;
  today?: Date;
}): LeaseTerm {
  const { household, registry, hasIncomingHousehold, today = new Date() } = args;
  if (!household) return registry;

  const registryStart = dayKey(registry.leaseStartDate);
  if (hasIncomingHousehold || !registryStart) return household;

  const householdStart = dayKey(household.leaseStartDate);
  const householdEnd = dayKey(household.leaseEndDate);
  if (householdStart && householdEnd && registryStart >= householdStart && registryStart <= householdEnd) {
    return registry;
  }
  if (registryStart > dayKeyOf(today)) return household;
  if (!householdStart || registryStart > householdStart) return registry;

  if (registryStart === householdStart) {
    const registryEnd = dayKey(registry.leaseEndDate);
    if (registryEnd && registryEnd >= registryStart && (!householdEnd || registryEnd > householdEnd)) {
      return registry;
    }
  }
  return household;
}
