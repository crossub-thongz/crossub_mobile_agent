import { PROPERTY_CONTACT_ROLE } from '@/constants/property-contact';
import {
  LEASING_CYCLE_ACTIVE_STATUS,
  MAINTENANCE_TERMINAL_STATUSES,
  TENANCY_CASE_TYPE,
  TENANCY_LEASE_STATUS,
  TENANCY_MOVED_OUT_REASON,
  TENANCY_PLACEHOLDER,
  TENANCY_ROW_GROUP,
  TENANCY_ROW_GROUP_RANK,
  TENANCY_ROW_KIND,
  TENANCY_ROW_STATUS,
  TENANCY_ROW_STATUS_LABEL,
  TENANCY_SECTION_COPY,
  TERMINATION_CASE_OPEN_STATUS,
  type TenancyMovedOutReason,
  type TenancyRowGroup,
  type TenancyRowKind,
  type TenancyRowStatus,
} from '@/constants/property-tenancies';
import type {
  PropertyTenancyArchive,
  PropertyTenancyCase,
  PropertyTenancyContact,
  PropertyTenancyLease,
  PropertyTenancyOverview,
} from '@/lib/crossub-api/agent-tenancy-client';
import { formatDateMedium } from '@/lib/format-datetime';
import {
  hasMovedOut,
  isPeriodicTenancy,
  isTenancyStatusLive,
  resolveOverviewLeaseTerm,
  selectCurrentTenancies,
  splitIncomingTenancies,
  type TenancyTermRow,
} from '@/utils/current-tenancy';
import { isSamePortalParty, resolvePortalCoContacts, splitJoinedTenantName } from '@/utils/portal-party';

/**
 * Current, upcoming and past tenancies for the Tenancies section: a port of
 * `buildPropertyTenancyRows` (`crossub_web/apps/web/modules/properties/property-portal-tenancy-rows.ts`,
 * as on PR #37) over the agent `tenancy-overview` payload. One row per agreement or archive;
 * `property-tenancy-groups.ts` folds them into households.
 */
export interface PropertyTenancyRow {
  id: string;
  kind: TenancyRowKind;
  tenantName: string;
  email?: string;
  mobile?: string;
  personId?: string;
  recordedVacateDate?: string;
  rentPaidUntil?: string;
  manualTenancy?: boolean;
  periodLabel: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  rentWeekly?: number;
  bondAmount?: number;
  status: TenancyRowStatus;
  statusLabel: string;
  movedOutReason?: TenancyMovedOutReason;
  group: TenancyRowGroup;
  /** Co-tenants beyond the row's own person — only ever on the current tenancy. */
  coTenants?: PropertyTenancyContact[];
  leaseId?: string;
  pinnedAsCurrent?: boolean;
  canPinAsCurrent?: boolean;
  leasingCaseId?: string;
  terminationCaseId?: string;
  /** The archive handle Restore tenant posts back. */
  restoreArchivedAt?: string;
  sortKey: string;
  moveOutDate?: string;
}

const LATEST_SORT_KEY = '9999-12-31';

const orUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

function parseIsoDate(value?: string | null): number {
  if (!value || value === TENANCY_PLACEHOLDER) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function formatPeriod(start?: string | null, end?: string | null): string {
  const startLabel = start && start !== TENANCY_PLACEHOLDER ? start : TENANCY_PLACEHOLDER;
  const endLabel = end && end !== TENANCY_PLACEHOLDER ? end : TENANCY_SECTION_COPY.PRESENT;
  return `${startLabel} ${TENANCY_SECTION_COPY.PERIOD_SEPARATOR} ${endLabel}`;
}

function terminationCases(record: PropertyTenancyOverview): PropertyTenancyCase[] {
  return record.leasingCases.filter((c) => c.type === TENANCY_CASE_TYPE.TERMINATION);
}

export function isOpenTerminationCase(leasingCase: PropertyTenancyCase): boolean {
  return leasingCase.status.toLowerCase().trim() === TERMINATION_CASE_OPEN_STATUS;
}

function activeLeasingCycle(record: PropertyTenancyOverview): PropertyTenancyCase | undefined {
  return record.leasingCases.find(
    (c) =>
      c.type === TENANCY_CASE_TYPE.NEW_LEASING &&
      c.status.toLowerCase() === LEASING_CYCLE_ACTIVE_STATUS,
  );
}

/** Is there a current tenant to archive? Mirrors the API's own guard. */
export function canArchiveTenant(record: PropertyTenancyOverview): boolean {
  if (record.tenant?.name?.trim()) return true;
  if ((record.currentTenancy?.tenancyIds?.length ?? 0) > 0) return true;
  return record.contacts.some(
    (c) => c.role === PROPERTY_CONTACT_ROLE.TENANT && Boolean(c.name?.trim()),
  );
}

/** The open end of lease an archive would cancel, if any — a warning, not a block. */
export function openTerminationCaseForArchive(
  record: PropertyTenancyOverview,
): { id: string; title: string } | null {
  const [open] = terminationCases(record).filter(isOpenTerminationCase);
  return open ? { id: open.id, title: open.title } : null;
}

/** The latest tenancy that had started by the case's vacate date owns the case. */
function assignTerminationCase(
  cases: PropertyTenancyCase[],
  start: string | undefined,
  allStarts: number[],
  isCurrent: boolean,
  leaseId?: string,
): PropertyTenancyCase | undefined {
  if (leaseId) {
    const bound = cases.find((c) => c.tenancyAgreementId === leaseId);
    if (bound) return bound;
  }
  const pool = cases.filter((c) => !c.tenancyAgreementId || c.tenancyAgreementId === leaseId);
  const startMs = parseIsoDate(start);
  return pool.find((c) => {
    if (!c.vacateDate) return isCurrent;
    const vacateMs = parseIsoDate(c.vacateDate);
    if (!vacateMs) return isCurrent;
    if (!startMs) return isCurrent;
    if (vacateMs < startMs) return false;
    return !allStarts.some((other) => other > startMs && other <= vacateMs);
  });
}

function tenantNameKeys(name: string | undefined): string[] {
  const names = splitJoinedTenantName(name);
  const source = names.length > 0 ? names : [name ?? ''];
  return source
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter((value) => value.length > 0 && value !== TENANCY_PLACEHOLDER);
}

/** Is this archive the same tenancy as that lease? Start dates must agree so a renewal stays apart. */
function archiveCoversLease(archived: PropertyTenancyArchive, lease: PropertyTenancyLease): boolean {
  const archivedKeys = tenantNameKeys(archived.tenantName);
  const leaseKeys = tenantNameKeys(lease.tenantName);
  if (archivedKeys.length === 0 || leaseKeys.length === 0) return false;
  if (!archivedKeys.some((key) => leaseKeys.includes(key))) return false;
  const archivedStart = archived.leaseStartDate?.slice(0, 10);
  const leaseStart = lease.leaseStartDate ? lease.leaseStartDate.slice(0, 10) : undefined;
  if (!archivedStart) return true;
  return archivedStart === leaseStart;
}

/** A job raised inside this tenancy's own window is still running. */
function hasOpenJobFromTenancy(lease: PropertyTenancyLease): boolean {
  return lease.maintenanceJobs.some((job) => {
    if (!job.status) return false;
    return !MAINTENANCE_TERMINAL_STATUSES.includes(job.status);
  });
}

function pastTenancyStatus(
  terminationCase: PropertyTenancyCase | undefined,
  lease?: PropertyTenancyLease,
): { status: TenancyRowStatus; reason?: TenancyMovedOutReason } {
  if (!terminationCase) {
    return { status: TENANCY_ROW_STATUS.MOVED_OUT, reason: TENANCY_MOVED_OUT_REASON.NO_CASE };
  }
  if (isOpenTerminationCase(terminationCase)) return { status: TENANCY_ROW_STATUS.VACATING };
  if (!terminationCase.bondReleased) {
    return { status: TENANCY_ROW_STATUS.MOVED_OUT, reason: TENANCY_MOVED_OUT_REASON.BOND_HELD };
  }
  if (lease && hasOpenJobFromTenancy(lease)) {
    return { status: TENANCY_ROW_STATUS.MOVED_OUT, reason: TENANCY_MOVED_OUT_REASON.JOB_OPEN };
  }
  return { status: TENANCY_ROW_STATUS.ARCHIVED };
}

/** The household living here now: Moved out only on a passed move-out, then Vacating, Periodic, Active. */
function currentTenancyStatus(
  lease: TenancyTermRow,
  terminationCase: PropertyTenancyCase | undefined,
  moveOutDate: string | null | undefined,
): { status: TenancyRowStatus; reason?: TenancyMovedOutReason } {
  if (hasMovedOut(moveOutDate)) {
    return {
      status: TENANCY_ROW_STATUS.MOVED_OUT,
      reason: terminationCase ? TENANCY_MOVED_OUT_REASON.BOND_HELD : TENANCY_MOVED_OUT_REASON.NO_CASE,
    };
  }
  if (terminationCase) return { status: TENANCY_ROW_STATUS.VACATING };
  if (isPeriodicTenancy(lease)) return { status: TENANCY_ROW_STATUS.PERIODIC };
  return { status: TENANCY_ROW_STATUS.ACTIVE };
}

/** Everyone on an archived tenancy except the person the row already names. */
function archivedCoTenants(archived: PropertyTenancyArchive): PropertyTenancyContact[] {
  const rows = archived.contacts;
  if (rows.length === 0) return [];
  const primaryIndex = Math.max(
    rows.findIndex((c) => c.isPrimary),
    0,
  );
  return rows
    .filter((_, index) => index !== primaryIndex)
    .map((contact, index) => ({
      id: `${archived.id}-contact-${index}`,
      role: PROPERTY_CONTACT_ROLE.TENANT,
      personId: null,
      name: contact.name,
      email: contact.email,
      mobile: contact.mobile,
      isPrimary: false,
    }));
}

/** The property's live rent on the current rows, unless a share house's leases disagree. */
function liveRentForCurrentRows(
  record: PropertyTenancyOverview,
  currentLeases: PropertyTenancyLease[],
): number | undefined {
  const live = record.financial.currentRentWeekly;
  if (live == null || !(live > 0)) return undefined;
  const rents = currentLeases
    .map((lease) => lease.rentWeekly)
    .filter((rent): rent is number => rent != null && rent > 0);
  if (rents.some((rent) => rent !== rents[0])) return undefined;
  return live;
}

/** Current + upcoming + past tenancies for the Tenancies section. */
export function buildPropertyTenancyRows(record: PropertyTenancyOverview): PropertyTenancyRow[] {
  const cycle = activeLeasingCycle(record);
  const leases = [...record.leaseHistory].sort(
    (a, b) => parseIsoDate(b.leaseStartDate) - parseIsoDate(a.leaseStartDate),
  );
  const pin = record.currentTenancy;
  const currentSelection = selectCurrentTenancies(leases, {
    pinnedTenancyId: pin?.pinStaleReason ? null : pin?.pinnedTenancyId,
    currentTenancyIds: pin?.tenancyIds,
  }).filter(isTenancyStatusLive);
  const { current: startedLeases, incoming: incomingLeases } = splitIncomingTenancies(
    currentSelection,
    leases,
    { incomingTenancyIds: pin?.incomingTenancyIds },
  );
  // One person holding two current leases (an unclosed renewal) shows once: the newest.
  const currentLeases = startedLeases.filter((lease, index, live) =>
    live.every(
      (earlier, earlierIndex) =>
        earlierIndex >= index || !isSamePortalParty(earlier.tenant, lease.tenant),
    ),
  );
  const hasCurrentLease = currentLeases.length > 0;
  const isLeftoverContact = (contact: PropertyTenancyContact): boolean =>
    leases.some((other) => !currentLeases.includes(other) && isSamePortalParty(contact, other.tenant));
  const tenancyStart = currentLeases
    .map((lease) => lease.leaseStartDate)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  const cases = terminationCases(record);
  const openCases = cases.filter(isOpenTerminationCase);
  const tenancyStarts = [
    ...leases
      .filter((lease) => !currentLeases.includes(lease) && !incomingLeases.includes(lease))
      .map((lease) => parseIsoDate(lease.leaseStartDate)),
    parseIsoDate(tenancyStart),
  ].filter((ms) => ms > 0);

  const liveRent = liveRentForCurrentRows(record, currentLeases);
  const pinnedLeaseId = pin?.pinStaleReason ? null : (pin?.pinnedTenancyId ?? null);

  const archives = record.archivedTenancies;
  const rows: PropertyTenancyRow[] = [];
  const mergedArchives = new Set<PropertyTenancyArchive>();
  const registryTerm = {
    leaseStartDate: orUndefined(record.overview.leaseStartDate),
    leaseEndDate: orUndefined(record.overview.leaseEndDate),
  };

  for (const lease of leases) {
    const isCurrent = currentLeases.includes(lease);
    const isIncoming = incomingLeases.includes(lease);
    const ownTerm = {
      leaseStartDate: orUndefined(lease.leaseStartDate),
      leaseEndDate: orUndefined(lease.leaseEndDate),
    };
    const term = isCurrent
      ? resolveOverviewLeaseTerm({
          household: ownTerm,
          registry: registryTerm,
          hasIncomingHousehold: incomingLeases.length > 0,
        })
      : ownTerm;
    const termStart = term.leaseStartDate || undefined;
    const termEnd = term.leaseEndDate || undefined;
    const termination = isIncoming
      ? undefined
      : assignTerminationCase(
          isCurrent ? openCases : cases,
          isCurrent ? tenancyStart : orUndefined(lease.leaseStartDate),
          tenancyStarts,
          isCurrent,
          lease.id,
        );

    let status: TenancyRowStatus = TENANCY_ROW_STATUS.ACTIVE;
    let reason: TenancyMovedOutReason | undefined;
    let restoreArchivedAt: string | undefined;
    let moveOutDate: string | undefined;
    const isManualDraft = lease.status === TENANCY_LEASE_STATUS.DRAFT;

    if (isIncoming || isCurrent) {
      const shadow = archives.find((entry) => archiveCoversLease(entry, lease));
      if (shadow) mergedArchives.add(shadow);
    }

    if (isManualDraft || isIncoming) {
      status = TENANCY_ROW_STATUS.INCOMING;
    } else if (isCurrent) {
      const current = currentTenancyStatus(
        { ...lease, leaseStartDate: termStart, leaseEndDate: termEnd },
        termination,
        termination?.vacateDate,
      );
      status = current.status;
      reason = current.reason;
    } else {
      const archived = archives.find((entry) => archiveCoversLease(entry, lease));
      if (archived) {
        mergedArchives.add(archived);
        status = TENANCY_ROW_STATUS.ARCHIVED;
        restoreArchivedAt = archived.restorable ? archived.archivedAt : undefined;
        moveOutDate = orUndefined(archived.vacateDate);
        reason = archived.withdrawnBeforeStart
          ? TENANCY_MOVED_OUT_REASON.WITHDRAWN_BEFORE_START
          : undefined;
      } else {
        const past = pastTenancyStatus(termination, lease);
        status = past.status;
        reason = past.reason;
        moveOutDate = orUndefined(termination?.vacateDate);
      }
    }

    rows.push({
      id: lease.id,
      kind: TENANCY_ROW_KIND.LEASE,
      tenantName: lease.tenantName,
      email: orUndefined(lease.tenant.email),
      mobile: orUndefined(lease.tenant.mobile),
      personId: orUndefined(lease.tenant.personId),
      recordedVacateDate: orUndefined(lease.vacateDate),
      rentPaidUntil: orUndefined(lease.rentPaidUntil),
      manualTenancy: lease.manualTenancy,
      coTenants: isCurrent
        ? resolvePortalCoContacts(record.contacts, PROPERTY_CONTACT_ROLE.TENANT, lease.tenant).filter(
            (contact) =>
              !currentLeases.some(
                (other) => other !== lease && isSamePortalParty(contact, other.tenant),
              ) && !isLeftoverContact(contact),
          )
        : undefined,
      periodLabel: formatPeriod(term.leaseStartDate, term.leaseEndDate),
      leaseStartDate: termStart,
      leaseEndDate: termEnd,
      rentWeekly: isCurrent
        ? (liveRent ?? orUndefined(lease.rentWeekly))
        : orUndefined(lease.rentWeekly),
      bondAmount: orUndefined(lease.bondAmount),
      status,
      statusLabel: isManualDraft ? TENANCY_SECTION_COPY.DRAFT : TENANCY_ROW_STATUS_LABEL[status],
      movedOutReason: reason,
      group:
        isManualDraft || isIncoming
          ? TENANCY_ROW_GROUP.INCOMING
          : isCurrent
            ? TENANCY_ROW_GROUP.CURRENT
            : TENANCY_ROW_GROUP.PAST,
      leasingCaseId: isIncoming ? cycle?.id : undefined,
      leaseId: lease.id,
      pinnedAsCurrent: pinnedLeaseId != null && lease.id === pinnedLeaseId,
      canPinAsCurrent: isTenancyStatusLive(lease) && !isIncoming,
      terminationCaseId:
        status === TENANCY_ROW_STATUS.VACATING || (isCurrent && status === TENANCY_ROW_STATUS.MOVED_OUT)
          ? termination?.id
          : undefined,
      restoreArchivedAt,
      moveOutDate,
      sortKey: termStart ?? '',
    });
  }

  if (cycle && !hasCurrentLease && incomingLeases.length === 0) {
    const availableFrom = orUndefined(record.overview.leaseStartDate);
    rows.unshift({
      id: `cycle-${cycle.id}`,
      kind: TENANCY_ROW_KIND.PENDING_CYCLE,
      tenantName: TENANCY_SECTION_COPY.APPLICANT_PENDING_NAME,
      periodLabel: availableFrom
        ? `${TENANCY_SECTION_COPY.AVAILABLE_FROM} ${formatDateMedium(availableFrom)}`
        : TENANCY_SECTION_COPY.LEASING_IN_PROGRESS,
      leaseStartDate: availableFrom,
      rentWeekly: orUndefined(cycle.currentRent),
      status: TENANCY_ROW_STATUS.LEASING_IN_PROGRESS,
      statusLabel: TENANCY_ROW_STATUS_LABEL[TENANCY_ROW_STATUS.LEASING_IN_PROGRESS],
      group: TENANCY_ROW_GROUP.CURRENT,
      leasingCaseId: cycle.id,
      sortKey: availableFrom ?? LATEST_SORT_KEY,
    });
  }

  const tenant = record.tenant;
  if (leases.length === 0 && tenant?.name?.trim()) {
    const start = orUndefined(tenant.leaseStartDate ?? record.overview.leaseStartDate);
    const end = orUndefined(tenant.leaseEndDate);
    const termination = assignTerminationCase(openCases, start, tenancyStarts, true);
    const snapshot = currentTenancyStatus(
      { leaseStartDate: start, leaseEndDate: end },
      termination,
      termination?.vacateDate ?? record.overview.vacateDate,
    );
    const rent = record.financial.currentRentWeekly;
    rows.unshift({
      id: `tenant-${record.propertyId}`,
      kind: TENANCY_ROW_KIND.PROPERTY_SNAPSHOT,
      tenantName: tenant.name,
      email: orUndefined(tenant.email),
      mobile: orUndefined(tenant.mobile),
      coTenants: resolvePortalCoContacts(record.contacts, PROPERTY_CONTACT_ROLE.TENANT, tenant),
      periodLabel: formatPeriod(start, end),
      leaseStartDate: start,
      leaseEndDate: end,
      rentWeekly: rent != null && rent > 0 ? rent : undefined,
      bondAmount: orUndefined(record.financial.bondAmount),
      status: snapshot.status,
      statusLabel: TENANCY_ROW_STATUS_LABEL[snapshot.status],
      movedOutReason: snapshot.reason,
      group: TENANCY_ROW_GROUP.CURRENT,
      terminationCaseId: termination?.id,
      sortKey: start ?? LATEST_SORT_KEY,
    });
  }

  for (const archived of archives) {
    if (mergedArchives.has(archived)) continue;
    rows.push({
      id: archived.id,
      kind: TENANCY_ROW_KIND.ARCHIVED_TENANCY,
      tenantName: archived.tenantName,
      email: orUndefined(archived.email),
      mobile: orUndefined(archived.mobile),
      coTenants: archivedCoTenants(archived),
      periodLabel: formatPeriod(
        archived.leaseStartDate,
        archived.vacateDate ?? archived.leaseEndDate ?? archived.archivedAt.slice(0, 10),
      ),
      leaseStartDate: orUndefined(archived.leaseStartDate),
      leaseEndDate: orUndefined(archived.leaseEndDate),
      rentWeekly: orUndefined(archived.rentWeekly),
      bondAmount: orUndefined(archived.bondAmount),
      status: TENANCY_ROW_STATUS.ARCHIVED,
      statusLabel: TENANCY_ROW_STATUS_LABEL[TENANCY_ROW_STATUS.ARCHIVED],
      group: TENANCY_ROW_GROUP.PAST,
      movedOutReason: archived.withdrawnBeforeStart
        ? TENANCY_MOVED_OUT_REASON.WITHDRAWN_BEFORE_START
        : undefined,
      restoreArchivedAt: archived.restorable ? archived.archivedAt : undefined,
      moveOutDate: orUndefined(archived.vacateDate),
      sortKey: archived.vacateDate ?? archived.leaseStartDate ?? '',
    });
  }

  return rows.sort((a, b) => {
    if (a.group !== b.group) return TENANCY_ROW_GROUP_RANK[a.group] - TENANCY_ROW_GROUP_RANK[b.group];
    return b.sortKey.localeCompare(a.sortKey);
  });
}
