import { filterNeedAttentionActions } from '@/lib/property-profile-v2-data';
import { buildPropertyOverviewJobRows } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { isPropertyVacant } from '@/lib/property-leasing';
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
import { daysUntilDate, formatCurrency, formatDate } from '@/lib/utils';

export type PropertyListV2Filter = 'all' | 'occupied' | 'vacant' | 'needs_attention';

export const PROPERTY_LIST_V2_FILTERS: {
  id: PropertyListV2Filter;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'occupied', label: 'Occupied' },
  { id: 'vacant', label: 'Vacant' },
  { id: 'needs_attention', label: 'Needs attention' },
];

export type PropertyListV2StatusTone = 'good' | 'warn' | 'muted';

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
  if (filter === 'needs_attention') {
    rows = rows.filter((property) => needActionCountFor(property.id) > 0);
  }
  return rows;
}

export function buildPropertyListV2RowStatus(
  property: Property,
  accounting?: PropertyAccounting | null,
): PropertyListV2RowStatus {
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

  const paidTo = property.rentPaidUntil;
  return {
    label: 'Rent paid',
    sublabel: paidTo ? `Up to ${formatDate(paidTo)}` : undefined,
    tone: 'good',
  };
}

export function buildPropertyListV2LeaseExpiry(
  property: Property,
  currentLease?: LeasingRecord,
): { label: string; sublabel?: string } {
  const { end } = resolveLeaseDates(property, currentLease);
  const leaseEnd = end ?? property.leaseEnd;
  if (!leaseEnd) return { label: '—' };
  const days = daysUntilDate(leaseEnd);
  return {
    label: formatDate(leaseEnd),
    sublabel: days != null ? `(${days} day${days === 1 ? '' : 's'})` : undefined,
  };
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
): { primary: string; secondary?: string } {
  const tenant = property.tenantName?.trim() || currentLease?.approvedTenant?.trim();
  const { start } = resolveLeaseDates(property, currentLease);
  const leaseStart = start ?? property.leaseStart ?? currentLease?.leaseStart;
  return {
    primary: tenant || (property.leaseStatus === 'vacant' ? 'Vacant' : '—'),
    secondary: leaseStart ? `Since ${formatDate(leaseStart)}` : undefined,
  };
}
