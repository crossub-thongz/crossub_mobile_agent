import { PROPERTY_CONTACT_ROLE } from '@/constants/property-contact';
import {
  TENANCY_PLACEHOLDER,
  TENANCY_ROW_GROUP,
  TENANCY_ROW_KIND,
  type TenancyMovedOutReason,
  type TenancyRowGroup,
  type TenancyRowKind,
  type TenancyRowStatus,
} from '@/constants/property-tenancies';
import type { PropertyTenancyOverview } from '@/lib/crossub-api/agent-tenancy-client';
import { isSamePortalParty, type PortalParty } from '@/utils/portal-party';
import { buildPropertyTenancyRows, type PropertyTenancyRow } from '@/utils/property-tenancy-rows';

/**
 * One household per tenancy, for the Tenancies section and the Overview tenancy card: a port of
 * `buildPropertyTenancyGroups` (`crossub_web/apps/web/modules/properties/property-portal-tenancy-groups.ts`,
 * as on PR #37). A share house is one agreement per person; the card lists them once.
 */
export interface PropertyTenancyMember {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  leaseId?: string;
  /** The person behind them, when known — gates "View contact" (edit details). */
  personId?: string;
  /** The member the property record mirrors: statutory notices go to them. */
  isPrimary: boolean;
}

export interface PropertyTenancyGroup {
  id: string;
  kind: TenancyRowKind;
  group: TenancyRowGroup;
  status: TenancyRowStatus;
  statusLabel: string;
  movedOutReason?: TenancyMovedOutReason;
  leaseStartDate?: string;
  leaseEndDate?: string;
  periodLabel: string;
  rentWeekly?: number;
  bondAmount?: number;
  recordedVacateDate?: string;
  rentPaidUntil?: string;
  members: PropertyTenancyMember[];
  rows: PropertyTenancyRow[];
  leaseId?: string;
  leaseIds: string[];
  leasingCaseId?: string;
  terminationCaseId?: string;
  restoreArchivedAt?: string;
  pinnedAsCurrent: boolean;
  canPinAsCurrent: boolean;
  sortKey: string;
  moveOutDate?: string;
}

function tenancyKey(row: PropertyTenancyRow): string {
  if (row.kind !== TENANCY_ROW_KIND.LEASE) return `${row.kind}:${row.id}`;
  return [
    row.group,
    row.status,
    row.leaseStartDate ?? '',
    row.leaseEndDate ?? '',
    row.terminationCaseId ?? '',
    row.restoreArchivedAt ?? '',
  ].join('|');
}

function hasName(value: string | null | undefined): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed) && trimmed !== TENANCY_PLACEHOLDER;
}

function addMember(members: PropertyTenancyMember[], candidate: PropertyTenancyMember): void {
  const existing = members.find((member) => isSamePortalParty(member, candidate));
  if (!existing) {
    members.push(candidate);
    return;
  }
  existing.email ??= candidate.email;
  existing.mobile ??= candidate.mobile;
  existing.leaseId ??= candidate.leaseId;
  existing.personId ??= candidate.personId;
  existing.isPrimary ||= candidate.isPrimary;
}

/** The person id the tenant snapshot knows for this party. */
function personIdFor(record: PropertyTenancyOverview, party: PortalParty): string | undefined {
  const tenant = record.tenant;
  if (!tenant) return undefined;
  if (tenant.personId && isSamePortalParty(tenant, party)) return tenant.personId;
  return (
    tenant.coTenants.find((co) => co.personId && isSamePortalParty(co, party))?.personId ??
    undefined
  );
}

/** Registry primary first, then the co-tenants in the snapshot's order, then anyone else. */
function orderCurrentMembers(
  record: PropertyTenancyOverview,
  members: PropertyTenancyMember[],
): PropertyTenancyMember[] {
  const tenant = record.tenant;
  if (!tenant?.name?.trim()) return members;
  const preferred: PortalParty[] = [tenant, ...tenant.coTenants];
  const rank = (member: PropertyTenancyMember): number => {
    const index = preferred.findIndex((party) => isSamePortalParty(party, member));
    return index < 0 ? preferred.length : index;
  };
  return [...members]
    .map((member, index) => ({ member, index, rank: rank(member) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ member }) => member);
}

export function buildPropertyTenancyGroups(record: PropertyTenancyOverview): PropertyTenancyGroup[] {
  const rows = buildPropertyTenancyRows(record);
  const groups = new Map<string, PropertyTenancyGroup>();

  for (const row of rows) {
    const key = tenancyKey(row);
    let group = groups.get(key);
    if (!group) {
      group = {
        id: `tenancy-${row.id}`,
        kind: row.kind,
        group: row.group,
        status: row.status,
        statusLabel: row.statusLabel,
        movedOutReason: row.movedOutReason,
        leaseStartDate: row.leaseStartDate,
        leaseEndDate: row.leaseEndDate,
        periodLabel: row.periodLabel,
        rentWeekly: row.rentWeekly,
        bondAmount: row.bondAmount,
        members: [],
        rows: [],
        leaseId: row.leaseId,
        leaseIds: [],
        leasingCaseId: row.leasingCaseId,
        terminationCaseId: row.terminationCaseId,
        restoreArchivedAt: row.restoreArchivedAt,
        pinnedAsCurrent: false,
        canPinAsCurrent: false,
        sortKey: row.sortKey,
        moveOutDate: row.moveOutDate,
      };
      groups.set(key, group);
    }

    group.rows.push(row);
    if (row.leaseId) group.leaseIds.push(row.leaseId);
    if (row.pinnedAsCurrent) {
      group.pinnedAsCurrent = true;
      group.leaseId = row.leaseId;
    }
    if (row.canPinAsCurrent) group.canPinAsCurrent = true;
    group.terminationCaseId ??= row.terminationCaseId;
    group.restoreArchivedAt ??= row.restoreArchivedAt;
    group.moveOutDate ??= row.moveOutDate;
    group.movedOutReason ??= row.movedOutReason;
    group.rentWeekly ??= row.rentWeekly;
    group.bondAmount ??= row.bondAmount;
    if (row.recordedVacateDate) group.recordedVacateDate ??= row.recordedVacateDate;
    if (row.rentPaidUntil) group.rentPaidUntil ??= row.rentPaidUntil;

    if (row.kind !== TENANCY_ROW_KIND.PENDING_CYCLE && hasName(row.tenantName)) {
      addMember(group.members, {
        id: `${row.id}-primary`,
        name: row.tenantName.trim(),
        email: row.email,
        mobile: row.mobile,
        leaseId: row.leaseId,
        personId:
          row.personId ??
          personIdFor(record, { name: row.tenantName, email: row.email, mobile: row.mobile }),
        isPrimary: false,
      });
    }
    for (const coTenant of row.coTenants ?? []) {
      if (!hasName(coTenant.name)) continue;
      addMember(group.members, {
        id: coTenant.id,
        name: coTenant.name.trim(),
        email: coTenant.email ?? undefined,
        mobile: coTenant.mobile ?? undefined,
        personId: coTenant.personId ?? personIdFor(record, coTenant),
        isPrimary: false,
      });
    }
  }

  const result = [...groups.values()];
  const tenantContacts = record.contacts.filter(
    (contact) => contact.role === PROPERTY_CONTACT_ROLE.TENANT,
  );
  for (const group of result) {
    if (group.group === TENANCY_ROW_GROUP.CURRENT) {
      // The contact row is the agent's own copy of the phone and email; it wins on the live card.
      for (const member of group.members) {
        const row = tenantContacts.find((contact) => isSamePortalParty(contact, member));
        if (!row) continue;
        if (row.email) member.email = row.email;
        if (row.mobile) member.mobile = row.mobile;
        member.personId ??= row.personId ?? undefined;
      }
      group.members = orderCurrentMembers(record, group.members);
    }
    const tenant = record.tenant;
    const primaryIndex =
      group.group === TENANCY_ROW_GROUP.CURRENT && tenant?.name?.trim()
        ? Math.max(
            group.members.findIndex((member) => isSamePortalParty(tenant, member)),
            0,
          )
        : 0;
    group.members = group.members.map((member, index) => ({
      ...member,
      isPrimary: index === primaryIndex,
    }));
    if (!group.leaseId) group.leaseId = group.members.find((m) => m.leaseId)?.leaseId;
  }
  return result;
}

export function selectCurrentTenancyGroup(
  groups: readonly PropertyTenancyGroup[],
): PropertyTenancyGroup | undefined {
  return groups.find((group) => group.group === TENANCY_ROW_GROUP.CURRENT);
}

export function selectIncomingTenancyGroups(
  groups: readonly PropertyTenancyGroup[],
): PropertyTenancyGroup[] {
  return groups.filter((group) => group.group === TENANCY_ROW_GROUP.INCOMING);
}

export function selectPastTenancyGroups(
  groups: readonly PropertyTenancyGroup[],
): PropertyTenancyGroup[] {
  return groups.filter((group) => group.group === TENANCY_ROW_GROUP.PAST);
}

/** "Sophia & Neil +2" — one line for a household. */
export function formatHouseholdLabel(
  members: readonly PropertyTenancyMember[],
  previewCount: number,
): string {
  const named = members.map((member) => member.name);
  const shown = named.slice(0, previewCount).join(' & ');
  const rest = named.length - previewCount;
  return rest > 0 ? `${shown} +${rest}` : shown;
}

/**
 * The agreements Remove tenancy may post: only an upcoming or draft household that Add tenancy
 * wrote, every row of it. The API checks the same again.
 */
export function removableManualLeaseIds(group: PropertyTenancyGroup): string[] {
  if (group.group !== TENANCY_ROW_GROUP.INCOMING || group.rows.length === 0) return [];
  if (!group.rows.every((row) => row.manualTenancy && row.leaseId)) return [];
  return [...new Set(group.rows.map((row) => row.leaseId as string))];
}
