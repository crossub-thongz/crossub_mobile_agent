import { filterNeedAttentionActions } from '@/lib/property-profile-v2-data';
import { buildPropertyOverviewJobRows } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { isPropertyVacant } from '@/lib/property-leasing';
import { isPropertyRegistryDraft } from '@/lib/property-registry-persist';
import { propertyCreatedAtIso } from '@/lib/record-created-at';
import { resolveLeaseDates } from '@/lib/property-overview';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  PropertyNeedAction,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import type { RentReviewDecision } from '@/lib/rent-review';
import { householdTenantsFromOverview, readRegistryDraftParties } from '@/lib/property-parties';
import type { AgentPropertyContact } from '@/lib/crossub-api/agent-client';
import { daysSinceDate, daysUntilDate, formatCurrency, formatDate } from '@/lib/utils';

const NEW_PROPERTY_DAYS = 14;

export type PropertyListV2Filter =
  | 'all'
  | 'occupied'
  | 'vacant'
  | 'arrears'
  | 'needs_attention'
  | 'archived';

export const PROPERTY_LIST_V2_FILTERS: {
  id: PropertyListV2Filter;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'occupied', label: 'Occupied' },
  { id: 'vacant', label: 'Vacant' },
  { id: 'arrears', label: 'Arrears' },
  { id: 'needs_attention', label: 'Needs attention' },
  { id: 'archived', label: 'Archived' },
];

export type PropertyListV2Sort = 'newest' | 'oldest' | 'az' | 'za' | 'arrears';

export const PROPERTY_LIST_V2_SORTS: {
  id: PropertyListV2Sort;
  label: string;
}[] = [
  { id: 'newest', label: 'Newest to oldest' },
  { id: 'oldest', label: 'Oldest to newest' },
  { id: 'az', label: 'A–Z' },
  { id: 'za', label: 'Z–A' },
  { id: 'arrears', label: 'Highest arrears' },
];

export type PropertyDirectoryTab = 'all' | 'arrears' | 'leases';
export type PropertyLeaseView = 'all' | 'expiring' | 'periodic';
export type PropertyLeaseWindow = 30 | 60 | 90;
export type PropertyOccupancyFilter = 'all' | 'occupied' | 'vacant';

export const PROPERTY_LEASE_WINDOWS: PropertyLeaseWindow[] = [30, 60, 90];
const LEASE_WARNING_DAYS = 30;

function propertyListV2AddressKey(property: Property): string {
  return [property.address, property.suburb, property.postcode].filter(Boolean).join(' ');
}

function propertyListV2CreatedMs(property: Property): number {
  const iso = propertyCreatedAtIso(property) ?? property.leaseStart;
  const ms = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

export function sortPropertiesForListV2(
  properties: Property[],
  sort: PropertyListV2Sort,
  accounting: PropertyAccounting[] = [],
): Property[] {
  const rows = [...properties];
  if (sort === 'arrears') {
    const amountFor = (property: Property) =>
      accounting.find((row) => row.propertyId === property.id)?.arrearsAmount ?? 0;
    const daysFor = (property: Property) =>
      accounting.find((row) => row.propertyId === property.id)?.daysInArrears ?? 0;
    rows.sort((a, b) => amountFor(b) - amountFor(a) || daysFor(b) - daysFor(a));
    return rows;
  }
  rows.sort((a, b) => {
    if (sort === 'newest' || sort === 'oldest') {
      const byCreated =
        sort === 'newest'
          ? propertyListV2CreatedMs(b) - propertyListV2CreatedMs(a)
          : propertyListV2CreatedMs(a) - propertyListV2CreatedMs(b);
      if (byCreated !== 0) return byCreated;
    }
    const byAddress = propertyListV2AddressKey(a).localeCompare(
      propertyListV2AddressKey(b),
      undefined,
      { sensitivity: 'base', numeric: true },
    );
    if (byAddress !== 0) return sort === 'za' ? -byAddress : byAddress;
    return a.id.localeCompare(b.id);
  });
  return rows;
}

export type PropertyListV2StatusTone = 'good' | 'warn' | 'muted' | 'draft' | 'new';

export type PropertyListV2RowStatus = {
  label: string;
  sublabel?: string;
  tone: PropertyListV2StatusTone;
};

export type PropertyListV2RowTasks = {
  maintenanceCount: number;
  leasingCount: number;
  inspectionCount: number;
  summary: string;
  subsummary?: string;
};

export function filterPropertiesForListV2(
  properties: Property[],
  filter: PropertyListV2Filter,
  accounting: PropertyAccounting[],
  needActionCountFor: (propertyId: string) => number,
): Property[] {
  let rows = [...properties];
  if (filter === 'occupied') {
    rows = rows.filter(
      (property) => property.leaseStatus === 'active' || property.leaseStatus === 'periodic',
    );
  }
  if (filter === 'vacant') {
    rows = rows.filter((property) => property.leaseStatus === 'vacant');
  }
  if (filter === 'arrears') {
    rows = rows.filter((property) => {
      const row = accounting.find((item) => item.propertyId === property.id);
      return (row?.arrearsAmount ?? 0) > 0 || (row?.daysInArrears ?? 0) > 0;
    });
  }
  if (filter === 'needs_attention') {
    rows = rows.filter((property) => needActionCountFor(property.id) > 0);
  }
  return rows;
}

export function buildPropertyListV2RowStatus(
  property: Property,
  accounting?: PropertyAccounting | null,
): PropertyListV2RowStatus {
  if (isPropertyRegistryDraft(property)) {
    return { label: 'Draft', sublabel: 'Finish registration', tone: 'draft' };
  }

  if (property.leaseStatus === 'vacant') {
    return { label: 'Vacant', sublabel: 'Available', tone: 'muted' };
  }

  const daysInArrears = accounting?.daysInArrears ?? 0;
  if (daysInArrears > 0) {
    const dueDate = accounting?.arrearsKeyDate ?? accounting?.arrearsOpenedAt;
    return {
      label: `${daysInArrears} day${daysInArrears === 1 ? '' : 's'} arrears`,
      sublabel: dueDate ? `Due ${formatDate(dueDate)}` : undefined,
      tone: 'warn',
    };
  }

  const addedDaysAgo =
    daysSinceDate(propertyCreatedAtIso(property)) ?? daysSinceDate(property.leaseStart);
  if (addedDaysAgo != null && addedDaysAgo <= NEW_PROPERTY_DAYS) {
    return {
      label: 'New',
      sublabel: addedDaysAgo === 0 ? 'Just added' : `Added ${addedDaysAgo} days ago`,
      tone: 'new',
    };
  }

  const paidTo = property.rentPaidUntil;
  if (paidTo) {
    return {
      label: 'Rent paid',
      sublabel: `Up to ${formatDate(paidTo)}`,
      tone: 'good',
    };
  }

  return { label: 'Occupied', tone: 'muted' };
}

export type PropertyLeaseExpiryTone = 'muted' | 'normal' | 'warning' | 'periodic';

export type PropertyLeaseExpiryDisplay = {
  kind: 'empty' | 'vacating' | 'periodic' | 'fixed';
  label: string;
  sublabel?: string;
  tone: PropertyLeaseExpiryTone;
  daysLeft: number | null;
};

export function buildPropertyListV2LeaseExpiry(
  property: Property,
  currentLease?: LeasingRecord,
): PropertyLeaseExpiryDisplay {
  if (isPropertyRegistryDraft(property) || property.leaseStatus === 'vacant') {
    return { kind: 'empty', label: '—', tone: 'muted', daysLeft: null };
  }

  const { start, end } = resolveLeaseDates(property, currentLease);
  const leaseEnd = end ?? property.leaseEnd;
  const days = leaseEnd ? daysUntilDate(leaseEnd) : null;
  const since = start ?? property.leaseStart;
  const periodicSince = days != null && days < 0 && leaseEnd ? leaseEnd : since;

  if (property.leaseStatus === 'vacating') {
    return {
      kind: 'vacating',
      label: leaseEnd ? formatDate(leaseEnd) : 'Vacating',
      sublabel: days != null && days < 0 ? 'Tenant has not left' : daysLeftLabel(days),
      tone: 'warning',
      daysLeft: days,
    };
  }

  const rolledOver = property.leaseStatus === 'active' && days != null && days < 0;
  const periodic = property.leaseStatus === 'periodic' || !leaseEnd?.trim() || rolledOver;

  if (periodic) {
    return {
      kind: 'periodic',
      label: 'Periodic',
      sublabel: periodicSince ? `Since ${formatDate(periodicSince)}` : undefined,
      tone: 'periodic',
      daysLeft: null,
    };
  }

  return {
    kind: 'fixed',
    label: formatDate(leaseEnd!),
    sublabel: daysLeftLabel(days),
    tone: days != null && days <= LEASE_WARNING_DAYS ? 'warning' : 'normal',
    daysLeft: days,
  };
}

function daysLeftLabel(days: number | null): string | undefined {
  if (days == null) return undefined;
  if (days < 0) {
    const overdue = Math.abs(days);
    return `${overdue} day${overdue === 1 ? '' : 's'} overdue`;
  }
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export function propertyInLeaseView(
  property: Property,
  currentLease: LeasingRecord | undefined,
  view: PropertyLeaseView,
  windowDays: PropertyLeaseWindow,
): boolean {
  const display = buildPropertyListV2LeaseExpiry(property, currentLease);
  if (display.kind === 'empty') return false;
  if (view === 'periodic') return display.kind === 'periodic';
  if (view === 'all') return true;
  if (display.kind === 'periodic') return false;
  if (display.daysLeft == null) return display.kind === 'vacating';
  return display.daysLeft <= windowDays;
}

export function buildPropertyListV2RowTasks(input: {
  propertyId: string;
  property: Property;
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  leasingCycles: LeasingCycle[];
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  tribunalCases: TribunalCase[];
  accounting?: PropertyAccounting | null;
  currentLease?: LeasingRecord;
  needActions: PropertyNeedAction[];
}): PropertyListV2RowTasks {
  const isVacant = isPropertyVacant(
    input.property,
    input.currentLease ? [input.currentLease] : [],
  );
  const leasingCases = buildPropertyLeasingWorkflowCases({
    propertyId: input.propertyId,
    leasingCycles: input.leasingCycles,
    tenantSelections: input.tenantSelections,
    vacatingCases: input.vacatingCases,
    rentReviews: input.rentReviews,
    rentReviewDecisions: input.rentReviewDecisions,
    currentLease: input.currentLease,
    isVacant,
  });
  const jobs = buildPropertyOverviewJobRows({
    maintenance: input.maintenance,
    inspections: input.inspections,
    rentReviews: input.rentReviews,
    rentReviewDecisions: input.rentReviewDecisions,
    leasingCases,
    tribunalCases: input.tribunalCases,
    vacatingCases: input.vacatingCases,
    accounting: input.accounting,
  }).filter((job) => job.phase === 'in_progress');

  const maintenanceCount = jobs.filter((job) => job.kind === 'maintenance').length;
  const leasingCount = jobs.filter(
    (job) => job.kind === 'leasing' || job.kind === 'rent_review' || job.kind === 'end_leasing',
  ).length;
  const inspectionCount = jobs.filter((job) => job.kind === 'inspection').length;
  const attention = filterNeedAttentionActions(input.needActions);

  if (isPropertyRegistryDraft(input.property)) {
    return {
      maintenanceCount: 0,
      leasingCount: 0,
      inspectionCount: 0,
      summary: 'Continue registration',
      subsummary: 'Pick up where you left off',
    };
  }

  if (attention.length > 0) {
    return {
      maintenanceCount,
      leasingCount,
      inspectionCount,
      summary: 'Approval required',
      subsummary: attention[0]?.label,
    };
  }

  if (jobs.length > 0) {
    return {
      maintenanceCount,
      leasingCount,
      inspectionCount,
      summary: 'CROS handling',
      subsummary: 'No action required',
    };
  }

  return {
    maintenanceCount: 0,
    leasingCount: 0,
    inspectionCount: 0,
    summary: 'No active tasks',
    subsummary: 'No action required',
  };
}

export function formatPropertyListV2Rent(property: Property): string {
  if (!property.rentWeekly || property.rentWeekly <= 0) return '—';
  return `${formatCurrency(property.rentWeekly)} / week`;
}

export function propertyListV2TenancyLabel(
  property: Property,
  currentLease?: LeasingRecord,
  contacts?: AgentPropertyContact[],
): { primary: string; secondary?: string; others: string[] } {
  if (isPropertyRegistryDraft(property)) {
    return { primary: 'Draft', secondary: 'Registration incomplete', others: [] };
  }
  const draftTenants = readRegistryDraftParties(property.registryDraft, 'tenants');
  const household = householdTenantsFromOverview({
    isVacant: property.leaseStatus === 'vacant',
    property: {
      tenantName: property.tenantName,
      tenantContact: property.tenantContact,
      additionalTenants: property.additionalTenants,
    },
    contacts: contacts?.length ? contacts : draftTenants,
  });
  const primaryTenant = household.find((tenant) => tenant.isPrimary) ?? household[0];
  const others = household
    .filter((tenant) => tenant !== primaryTenant)
    .map((tenant) => tenant.name.trim())
    .filter(Boolean);
  const tenant =
    primaryTenant?.name.trim() ||
    property.tenantName?.trim() ||
    currentLease?.approvedTenant?.trim();
  const { start } = resolveLeaseDates(property, currentLease);
  const leaseStart = start ?? property.leaseStart ?? currentLease?.leaseStart;
  return {
    primary: tenant || (property.leaseStatus === 'vacant' ? 'Vacant' : '—'),
    secondary: leaseStart ? `Since ${formatDate(leaseStart)}` : undefined,
    others,
  };
}
