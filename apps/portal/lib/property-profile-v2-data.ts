import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { isPropertyVacant } from '@/lib/property-leasing';
import { buildPropertyOverviewJobRows, type PropertyJobRow } from '@/lib/property-job-rows';
import { resolveIngoingInspectionDateDisplay } from '@/lib/ingoing-inspection-display';
import { isInspectionDone } from '@/lib/inspections/presentation';
import { isDeletedInspection } from '@/lib/property-inspection-history';
import { isRentReviewDecided } from '@/lib/rent-review';
import { deriveRentReviewDueDateFromInput } from '@/lib/rent-review/scheduling';
import {
  resolveBondOverviewDisplay,
  resolveCurrentRent,
  resolveLeaseDates,
  resolveRentPaidTo,
} from '@/lib/property-overview';
import type { PropertyPortalAccounting } from '@/lib/property-registry-api';
import type { PropertyOverviewSync } from '@/lib/use-property-overview-sync';
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
import { tenancyReferenceLabel } from '@/lib/workflow-case-reference';
import { formatCurrency, formatDate, resolveOutstandingArrearsDays } from '@/lib/utils';

export type PropertyProfileSection =
  | 'overview'
  | 'tasks'
  | 'financials'
  | 'documents'
  | 'archive'
  | 'activities';

export const PROPERTY_PROFILE_SECTIONS: {
  id: PropertyProfileSection;
  label: string;
}[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'financials', label: 'Financials' },
  { id: 'documents', label: 'Documents' },
  { id: 'archive', label: 'Archived' },
  { id: 'activities', label: 'Activities' },
];

/** Level 1 (inspection-only) does not record arrears or rent chasing. */
export function propertyProfileSectionsForAccess(hasFullAccess: boolean) {
  if (hasFullAccess) return PROPERTY_PROFILE_SECTIONS;
  return PROPERTY_PROFILE_SECTIONS.filter((tab) => tab.id !== 'financials');
}

function firstNamesFromLabel(name: string): string[] {
  return name
    .split(/\s*&\s*|\s+and\s+/i)
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/** e.g. "Daniel & Tony (TEN0012)" or "Daniel (TEN0012)". */
export function formatCurrentTenancyHeading(input: {
  isVacant: boolean;
  tenantName?: string | null;
  additionalTenants?: Array<{ name?: string | null }>;
  leaseId?: string | null;
  propertyId: string;
}): string {
  if (input.isVacant) return 'Vacant';
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of [
    ...firstNamesFromLabel(input.tenantName ?? ''),
    ...(input.additionalTenants ?? []).flatMap((tenant) =>
      firstNamesFromLabel(tenant.name ?? ''),
    ),
  ]) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(part);
  }
  const label = names.join(' & ') || '—';
  return `${label} (${tenancyReferenceLabel(input.leaseId?.trim() || input.propertyId)})`;
}

export type PropertyUpcomingItem = {
  id: string;
  label: string;
  date: string;
  dateLabel: string;
  kind: 'inspection' | 'lease' | 'rent_review' | 'other';
};

export type PropertyCalendarEventKind =
  | 'inspection'
  | 'lease'
  | 'rent_review'
  | 'end_leasing'
  | 'tribunal'
  | 'other';

export type PropertyCalendarEvent = {
  id: string;
  label: string;
  at: string;
  kind: PropertyCalendarEventKind;
  detail?: string;
};

const INSPECTION_LABEL: Record<Inspection['type'], string> = {
  OPEN: 'Open inspection',
  INGOING: 'Ingoing inspection',
  OUTGOING: 'Outgoing inspection',
  ROUTINE: 'Routine inspection',
};

export function propertyCalendarDayKey(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso.slice(0, 10);
  return propertyCalendarDayFromDate(parsed);
}

export function propertyCalendarDayFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfTodayMs(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function isUpcomingCalendarDate(iso: string): boolean {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  parsed.setHours(0, 0, 0, 0);
  return parsed.getTime() >= startOfTodayMs();
}

function pushCalendarEvent(
  events: PropertyCalendarEvent[],
  seen: Set<string>,
  event: PropertyCalendarEvent,
) {
  if (!isUpcomingCalendarDate(event.at)) return;
  const key = `${event.id}:${propertyCalendarDayKey(event.at)}`;
  if (seen.has(key)) return;
  seen.add(key);
  events.push(event);
}

export function normalizePropertyProfileSection(
  raw: string | null,
): PropertyProfileSection {
  if (
    raw === 'tasks' ||
    raw === 'financials' ||
    raw === 'documents' ||
    raw === 'archive' ||
    raw === 'activities'
  ) {
    return raw;
  }
  return 'overview';
}

export function buildPropertyProfileMetrics(args: {
  property: Property;
  currentLease?: LeasingRecord;
  sync: PropertyOverviewSync;
  accounting?: PropertyAccounting | null;
  portalAccounting?: PropertyPortalAccounting | null;
}): {
  rentLabel: string;
  leaseExpiryLabel: string;
  arrearsLabel: string;
  bondLabel: string;
  rentStatusLabel: string;
  rentStatusTone: 'good' | 'warn' | 'muted';
} {
  const { property, currentLease, sync, accounting, portalAccounting } = args;
  const currentRent = resolveCurrentRent(property, currentLease);
  const financialRent = sync.financial?.currentRentWeekly;
  const registryRent = sync.record?.rentWeekly ?? property.rentWeekly;
  const displayRent =
    financialRent != null && financialRent > 0
      ? financialRent
      : registryRent != null && registryRent > 0
        ? registryRent
        : currentRent;

  const { end: leaseEnd } = resolveLeaseDates(property, currentLease);
  const leaseExpiry =
    sync.overview?.leaseEndDate ??
    sync.record?.leaseEndDate ??
    leaseEnd ??
    property.leaseEnd;

  const rentPaidTo = resolveRentPaidTo(
    sync.record?.rentPaidUntil ??
      sync.overview?.rentPaidUntilDate ??
      property.rentPaidUntil,
    sync.accounting ?? portalAccounting ?? undefined,
  );
  const outstandingAmount =
    portalAccounting?.outstandingRentAmount ?? accounting?.arrearsAmount ?? 0;
  const daysInArrears = resolveOutstandingArrearsDays({
    rentPaidTo,
    outstandingAmount,
    reportedDays: portalAccounting?.outstandingRentDays ?? accounting?.daysInArrears ?? null,
  });

  const bondAmount =
    sync.financial?.bondAmount ??
    sync.record?.bondAmount ??
    property.bondAmount ??
    sync.bond?.amount ??
    null;
  const bond = resolveBondOverviewDisplay(
    bondAmount,
    sync.bond,
    Boolean(sync.bond || property.bondAmount),
  );

  const rentStatusTone: 'good' | 'warn' | 'muted' =
    daysInArrears > 0 ? 'warn' : rentPaidTo ? 'good' : 'muted';

  return {
    rentLabel:
      displayRent != null && displayRent > 0
        ? `${formatCurrency(displayRent)} / week`
        : '—',
    leaseExpiryLabel: leaseExpiry ? formatDate(leaseExpiry) : '—',
    arrearsLabel: `${daysInArrears} day${daysInArrears === 1 ? '' : 's'}`,
    bondLabel: bond.amountLabel !== '—' ? bond.amountLabel : '—',
    rentStatusLabel: rentPaidTo ? `Paid up to ${formatDate(rentPaidTo)}` : '—',
    rentStatusTone,
  };
}

export function buildCrosHandlingJobs(input: {
  propertyId: string;
  property: Property;
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null>;
  leasingCycles: LeasingCycle[];
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  tribunalCases: TribunalCase[];
  accounting?: PropertyAccounting | null;
  currentLease?: LeasingRecord;
}): PropertyJobRow[] {
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

  return buildPropertyOverviewJobRows({
    maintenance: input.maintenance,
    inspections: input.inspections,
    rentReviews: input.rentReviews,
    rentReviewDecisions: input.rentReviewDecisions,
    leasingCases,
    tribunalCases: input.tribunalCases,
    vacatingCases: input.vacatingCases,
    accounting: input.accounting,
  }).slice(0, 4);
}

export function buildPropertyUpcomingItems(args: {
  sync: PropertyOverviewSync;
  property: Property;
  currentLease?: LeasingRecord;
  inspections: Inspection[];
  propertyId: string;
}): PropertyUpcomingItem[] {
  const { sync, property, currentLease, inspections, propertyId } = args;
  const { end: leaseEnd } = resolveLeaseDates(property, currentLease);
  const items: PropertyUpcomingItem[] = [];

  const routineDate =
    sync.overview?.nextRoutineInspectionDate ?? sync.record?.nextInspectionAt;
  if (routineDate) {
    items.push({
      id: 'routine',
      label: 'Routine inspection',
      date: routineDate,
      dateLabel: formatDate(routineDate),
      kind: 'inspection',
    });
  } else {
    const nextRoutine = inspections
      .filter((i) => i.propertyId === propertyId && i.type === 'ROUTINE')
      .filter((i) => i.scheduledAt)
      .sort(
        (a, b) =>
          new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime(),
      )[0];
    if (nextRoutine?.scheduledAt) {
      items.push({
        id: `inspection-${nextRoutine.id}`,
        label: 'Routine inspection',
        date: nextRoutine.scheduledAt,
        dateLabel: formatDate(nextRoutine.scheduledAt),
        kind: 'inspection',
      });
    }
  }

  const leaseExpiry =
    sync.overview?.leaseEndDate ??
    sync.record?.leaseEndDate ??
    leaseEnd ??
    property.leaseEnd;
  if (leaseExpiry) {
    items.push({
      id: 'lease-renewal',
      label: 'Lease renewal',
      date: leaseExpiry,
      dateLabel: formatDate(leaseExpiry),
      kind: 'lease',
    });
  }

  const rentReview =
    sync.overview?.nextRentReviewDate ??
    sync.record?.nextRentReviewAt ??
    property.nextRentReview;
  if (rentReview) {
    items.push({
      id: 'rent-review',
      label: 'Rent review',
      date: rentReview,
      dateLabel: formatDate(rentReview),
      kind: 'rent_review',
    });
  }

  return items
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);
}

export function buildPropertyCalendarEvents(args: {
  property: Property;
  propertyId: string;
  currentLease?: LeasingRecord;
  sync: PropertyOverviewSync;
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null>;
  vacatingCases: VacatingCase[];
  tribunalCases: TribunalCase[];
}): PropertyCalendarEvent[] {
  const {
    property,
    propertyId,
    currentLease,
    sync,
    inspections,
    rentReviews,
    rentReviewDecisions,
    vacatingCases,
    tribunalCases,
  } = args;
  const events: PropertyCalendarEvent[] = [];
  const seen = new Set<string>();
  const { end: leaseEnd } = resolveLeaseDates(property, currentLease);

  for (const inspection of inspections) {
    if (inspection.propertyId !== propertyId) continue;
    if (isDeletedInspection(inspection) || isInspectionDone(inspection)) continue;
    const scheduledIso =
      inspection.type === 'INGOING'
        ? resolveIngoingInspectionDateDisplay({
            scheduledDate: inspection.scheduledAt,
            moveInDate: inspection.moveInDate,
          }).iso
        : inspection.scheduledAt;
    if (!scheduledIso) continue;
    pushCalendarEvent(events, seen, {
      id: `inspection-${inspection.id}`,
      label: INSPECTION_LABEL[inspection.type],
      at: scheduledIso,
      kind: 'inspection',
      detail: inspection.inspector ?? inspection.trackingNumber,
    });
  }

  const routineDate =
    sync.overview?.nextRoutineInspectionDate ?? sync.record?.nextInspectionAt;
  if (routineDate) {
    pushCalendarEvent(events, seen, {
      id: 'routine-sync',
      label: 'Routine inspection',
      at: routineDate,
      kind: 'inspection',
    });
  }

  for (const review of rentReviews) {
    if (review.propertyId && review.propertyId !== propertyId) continue;
    if (isRentReviewDecided(review, rentReviewDecisions[review.id])) continue;
    const dueDate = deriveRentReviewDueDateFromInput({
      leaseEnd: review.leaseEnd,
      reviewDue: review.reviewDue,
      newLeaseStart: review.leaseStart,
    });
    if (!dueDate) continue;
    pushCalendarEvent(events, seen, {
      id: `rent-review-${review.id}`,
      label: 'Rent review',
      at: dueDate,
      kind: 'rent_review',
    });
  }

  const rentReviewDate =
    sync.overview?.nextRentReviewDate ??
    sync.record?.nextRentReviewAt ??
    property.nextRentReview;
  if (rentReviewDate) {
    pushCalendarEvent(events, seen, {
      id: 'rent-review-sync',
      label: 'Rent review',
      at: rentReviewDate,
      kind: 'rent_review',
    });
  }

  const leaseExpiry =
    sync.overview?.leaseEndDate ??
    sync.record?.leaseEndDate ??
    leaseEnd ??
    property.leaseEnd;
  if (leaseExpiry) {
    pushCalendarEvent(events, seen, {
      id: 'lease-renewal',
      label: 'Lease renewal',
      at: leaseExpiry,
      kind: 'lease',
    });
  }

  for (const vacating of vacatingCases) {
    if (vacating.propertyId !== propertyId) continue;
    if (!vacating.vacateDate) continue;
    const terminal = vacating.apiStatus?.toLowerCase().includes('completed');
    if (terminal) continue;
    pushCalendarEvent(events, seen, {
      id: `vacating-${vacating.id}`,
      label: 'End leasing / vacate',
      at: vacating.vacateDate,
      kind: 'end_leasing',
      detail: vacating.reason,
    });
  }

  for (const tribunal of tribunalCases) {
    if (tribunal.propertyId !== propertyId) continue;
    if (!tribunal.hearingDate || tribunal.status === 'closed') continue;
    pushCalendarEvent(events, seen, {
      id: `tribunal-${tribunal.id}`,
      label: 'Tribunal hearing',
      at: tribunal.hearingDate,
      kind: 'tribunal',
      detail: tribunal.matter,
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function leaseOccupancyLabel(property: Property, isVacant: boolean): string {
  if (isVacant || property.leaseStatus === 'vacant') return 'Vacant';
  return 'Occupied';
}

export function filterNeedAttentionActions(actions: PropertyNeedAction[]): PropertyNeedAction[] {
  return actions.filter(
    (item) =>
      item.priority === 'urgent' ||
      /approv|quot|review|sign|confirm|action required/i.test(item.label),
  );
}
