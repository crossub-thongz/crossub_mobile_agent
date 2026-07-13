import {
  inspectionWorkflowProgress,
  maintenanceWorkflowProgress,
  rentReviewWorkflowProgress,
  tribunalWorkflowProgress,
  vacatingWorkflowProgress,
} from '@/lib/case-workflows';
import type { PropertyLeasingWorkflowCase } from '@/lib/property-leasing-workflow-cases';
import { isDeletedRentReview } from '@/lib/property-rent-review-history';
import { isDeletedInspection } from '@/lib/property-inspection-history';
import { isRentReviewDecided } from '@/lib/rent-review';
import type { RentReviewDecision } from '@/lib/rent-review';
import { getRentReviewScheduleIndicators } from '@/lib/rent-review/conduct-countdown';
import { deriveRentReviewDueDateFromInput } from '@/lib/rent-review/scheduling';
import type { RentReviewScheduleIndicators } from '@/lib/rent-review/conduct-countdown';
import type {
  ArchivedRentReview,
  Inspection,
  MaintenanceRequest,
  PropertyAccounting,
  RentReviewCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency, formatScheduledAt } from '@/lib/utils';
import { inspectionReferenceLabel, workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import {
  inspectionCreatedAtIso,
  maintenanceCreatedAtIso,
  rentReviewCreatedAtIso,
  tribunalCreatedAtIso,
  vacatingCreatedAtIso,
} from '@/lib/record-created-at';
import { parseSortTime } from '@/lib/client-table-sort';

export type PropertyJobPhase = 'in_progress' | 'completed';

export type PropertyJobKind =
  | 'maintenance'
  | 'inspection'
  | 'rent_review'
  | 'leasing'
  | 'end_leasing'
  | 'tribunal'
  | 'accounting';

export interface PropertyJobRow {
  id: string;
  kind: PropertyJobKind;
  jobType: string;
  name: string;
  description: string;
  /** Contextual date (due, scheduled, vacate, etc.). */
  date: string;
  /** Formatted created timestamp for display. */
  createdAt: string;
  /** Milliseconds for client-side table sort. */
  createdAtMs: number;
  status: string;
  phase: PropertyJobPhase;
  /** Maintenance issue type / category (maintenance only). */
  issueType?: string;
  /** Rent review T−90 / T−60 schedule badges (rent review only). */
  rentReviewSchedule?: RentReviewScheduleIndicators;
}

/** Stable filter keys for the jobs table dropdown (overview, etc.). */
export type PropertyJobTypeFilterId =
  | 'new_leasing'
  | 'end_leasing'
  | 'open_inspection'
  | 'routine_inspection'
  | 'ingoing_inspection'
  | 'outgoing_inspection'
  | 'maintenance'
  | 'rent_review'
  | 'tribunal';

export const PROPERTY_JOB_TYPE_FILTER_OPTIONS: {
  id: PropertyJobTypeFilterId;
  label: string;
}[] = [
  { id: 'new_leasing', label: 'New leasing' },
  { id: 'end_leasing', label: 'End leasing' },
  { id: 'open_inspection', label: 'Open inspection' },
  { id: 'routine_inspection', label: 'Routine inspection' },
  { id: 'ingoing_inspection', label: 'Ingoing inspection' },
  { id: 'outgoing_inspection', label: 'Outgoing inspection' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'rent_review', label: 'Rent review' },
  { id: 'tribunal', label: 'Tribunal' },
];

/** Display order for mixed job tables (overview, etc.). */
const PROPERTY_JOB_TYPE_ORDER: string[] = [
  'New leasing',
  'Open inspection',
  'Rent review',
  'End leasing',
  'Outgoing inspection',
  'Ingoing inspection',
  'Routine inspection',
  'Maintenance',
  'Tribunal',
  'Accounting',
];

function propertyJobTypeRank(jobType: string): number {
  const index = PROPERTY_JOB_TYPE_ORDER.indexOf(jobType);
  return index === -1 ? PROPERTY_JOB_TYPE_ORDER.length : index;
}

function comparePropertyJobRows(a: PropertyJobRow, b: PropertyJobRow): number {
  const byCategory = propertyJobTypeRank(a.jobType) - propertyJobTypeRank(b.jobType);
  if (byCategory !== 0) return byCategory;
  return b.createdAtMs - a.createdAtMs;
}

function rowCreatedAt(iso?: string): { createdAt: string; createdAtMs: number } {
  const createdAtMs = parseSortTime(iso);
  return {
    createdAt: iso ? formatDateTime(iso) : '—',
    createdAtMs,
  };
}

export function organizePropertyJobRows(rows: PropertyJobRow[]): PropertyJobRow[] {
  return [...rows].sort(comparePropertyJobRows);
}

/** Map a row to the canonical filter id used by the jobs table dropdown. */
export function propertyJobRowFilterId(row: PropertyJobRow): PropertyJobTypeFilterId {
  switch (row.kind) {
    case 'maintenance':
      return 'maintenance';
    case 'tribunal':
      return 'tribunal';
    case 'rent_review':
      return 'rent_review';
    case 'end_leasing':
      return 'end_leasing';
    case 'leasing':
      return 'new_leasing';
    case 'inspection':
      switch (row.jobType) {
        case 'Routine inspection':
          return 'routine_inspection';
        case 'Ingoing inspection':
          return 'ingoing_inspection';
        case 'Outgoing inspection':
          return 'outgoing_inspection';
        case 'Open inspection':
        default:
          return 'open_inspection';
      }
    default:
      if (row.jobType === 'End leasing') return 'end_leasing';
      if (row.jobType === 'Rent review') return 'rent_review';
      if (row.jobType === 'Maintenance') return 'maintenance';
      if (row.jobType === 'Tribunal') return 'tribunal';
      if (row.jobType === 'New leasing' || row.jobType === 'Leasing') return 'new_leasing';
      return 'open_inspection';
  }
}

/** Filter dropdown options for rows currently visible in the table. */
export function availablePropertyJobTypeFilters(
  rows: PropertyJobRow[],
): { id: PropertyJobTypeFilterId; label: string }[] {
  const present = new Set(rows.map(propertyJobRowFilterId));
  return PROPERTY_JOB_TYPE_FILTER_OPTIONS.filter((option) => present.has(option.id));
}

export function matchesPropertyJobTypeFilter(
  row: PropertyJobRow,
  filterId: PropertyJobTypeFilterId | 'all',
): boolean {
  if (filterId === 'all') return true;
  return propertyJobRowFilterId(row) === filterId;
}

export function groupPropertyJobRows(
  rows: PropertyJobRow[],
  preserveOrder = false,
  /** When true, one group per job-type label (for section headers after date/name sort). */
  mergeByLabel = false,
): { label: string; rows: PropertyJobRow[] }[] {
  if (mergeByLabel) {
    const groupMap = new Map<string, PropertyJobRow[]>();
    for (const row of rows) {
      const bucket = groupMap.get(row.jobType);
      if (bucket) bucket.push(row);
      else groupMap.set(row.jobType, [row]);
    }
    const orderedLabels = PROPERTY_JOB_TYPE_ORDER.filter((label) => groupMap.has(label));
    const extraLabels = [...groupMap.keys()]
      .filter((label) => !PROPERTY_JOB_TYPE_ORDER.includes(label))
      .sort((a, b) => a.localeCompare(b));
    return [...orderedLabels, ...extraLabels].map((label) => ({
      label,
      rows: groupMap.get(label)!,
    }));
  }

  const organized = preserveOrder ? rows : organizePropertyJobRows(rows);
  const groups: { label: string; rows: PropertyJobRow[] }[] = [];
  for (const row of organized) {
    const last = groups[groups.length - 1];
    if (last?.label === row.jobType) {
      last.rows.push(row);
    } else {
      groups.push({ label: row.jobType, rows: [row] });
    }
  }
  return groups;
}

export function splitPropertyJobRows(rows: PropertyJobRow[]): {
  inProgress: PropertyJobRow[];
  completed: PropertyJobRow[];
} {
  const inProgress: PropertyJobRow[] = [];
  const completed: PropertyJobRow[] = [];
  for (const row of rows) {
    if (row.phase === 'completed') completed.push(row);
    else inProgress.push(row);
  }
  return {
    inProgress: organizePropertyJobRows(inProgress),
    completed: organizePropertyJobRows(completed),
  };
}

function isCompletedMaintenance(request: MaintenanceRequest): boolean {
  const status = request.status.toLowerCase();
  return status.includes('complete') || status.includes('closed') || status.includes('cancelled');
}

function isCompletedInspection(inspection: Inspection): boolean {
  const status = inspection.status.toLowerCase();
  return status.includes('complete') || status.includes('published') || status.includes('cancelled');
}

const INSPECTION_JOB_TYPE: Record<Inspection['type'], string> = {
  OPEN: 'Open inspection',
  INGOING: 'Ingoing inspection',
  OUTGOING: 'Outgoing inspection',
  ROUTINE: 'Routine inspection',
};

function responsibilityLabelForRow(
  responsibility: MaintenanceRequest['responsibility'],
): string {
  switch (responsibility) {
    case 'tenant':
      return 'Tenant';
    case 'landlord':
      return 'Landlord';
    case 'strata':
      return 'Strata';
    default:
      return 'Pending';
  }
}

function maintenanceIssueType(request: MaintenanceRequest): string {
  return request.title?.trim() || '—';
}

function maintenanceDescriptionBody(request: MaintenanceRequest): string {
  const description = request.description?.trim() ?? '';
  const issueType = request.title?.trim() ?? '';
  if (issueType && description.toLowerCase().startsWith(`${issueType.toLowerCase()}:`)) {
    return description.slice(issueType.length + 1).trim() || '—';
  }
  return description || '—';
}

function formatRentReviewJobDescription(
  review: RentReviewCase,
  decision?: RentReviewDecision | null,
): string {
  const currentLabel =
    review.currentRent > 0 ? `${formatCurrency(review.currentRent)}/wk` : '—';

  let newRent: number | null = null;
  if (decision?.action === 'custom' && decision.amount != null && decision.amount > 0) {
    newRent = decision.amount;
  } else if (review.agreedRent != null && review.agreedRent > 0) {
    newRent = review.agreedRent;
  } else if (review.counterOffer != null && review.counterOffer > 0) {
    newRent = review.counterOffer;
  } else if (review.suggestedRent > 0) {
    newRent = review.suggestedRent;
  }

  const newLabel = newRent != null ? `${formatCurrency(newRent)}/wk` : '—';
  return `${currentLabel} → ${newLabel}`;
}

export function maintenanceJobRows(requests: MaintenanceRequest[]): PropertyJobRow[] {
  return requests.map((request) => {
    const progress = maintenanceWorkflowProgress(request);
    const createdIso = maintenanceCreatedAtIso(request);
    const { createdAt, createdAtMs } = rowCreatedAt(createdIso);
    return {
      id: request.id,
      kind: 'maintenance',
      jobType: 'Maintenance',
      name: request.trackingNumber || workflowCaseReferenceLabel(request.id, 'maintenance'),
      issueType: maintenanceIssueType(request),
      description: [
        maintenanceDescriptionBody(request),
        request.responsibility !== 'pending'
          ? responsibilityLabelForRow(request.responsibility)
          : null,
        request.priority === 'urgent' || request.priority === 'high'
          ? request.priority
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      date: createdAt,
      createdAt,
      createdAtMs,
      status: progress.currentStepLabel,
      phase: isCompletedMaintenance(request) ? 'completed' : 'in_progress',
    };
  });
}

export function inspectionJobRows(inspections: Inspection[]): PropertyJobRow[] {
  return inspections.map((inspection) => {
    const progress = inspectionWorkflowProgress(inspection);
    const createdIso = inspectionCreatedAtIso(inspection);
    const { createdAt, createdAtMs } = rowCreatedAt(createdIso);
    const deleted = isDeletedInspection(inspection);
    return {
      id: inspection.id,
      kind: 'inspection',
      jobType: INSPECTION_JOB_TYPE[inspection.type],
      name:
        inspection.trackingNumber || inspectionReferenceLabel(inspection.id, inspection.type),
      description: [
        inspection.inspector ? inspection.inspector : null,
        inspection.scheduledAt ? formatScheduledAt(inspection.scheduledAt) : null,
        inspection.reportStatus !== 'pending' ? `Report: ${inspection.reportStatus}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || '—',
      date: inspection.scheduledAt ? formatScheduledAt(inspection.scheduledAt) : '—',
      createdAt,
      createdAtMs,
      status: deleted ? 'Deleted' : progress.currentStepLabel,
      phase: deleted || isCompletedInspection(inspection) ? 'completed' : 'in_progress',
    };
  });
}

export function leasingWorkflowJobRows(cases: PropertyLeasingWorkflowCase[]): PropertyJobRow[] {
  const jobTypeByCategory: Record<PropertyLeasingWorkflowCase['category'], string> = {
    leasing: 'New leasing',
    rent_review: 'Rent review',
    end_leasing: 'End leasing',
  };

  return cases.map((item) => {
    const terminal =
      item.status?.toLowerCase().includes('completed') ||
      item.status?.toLowerCase().includes('closed') ||
      item.status?.toLowerCase().includes('cancelled');
    const { createdAt, createdAtMs } = rowCreatedAt(item.createdAt);
    return {
      id: item.id,
      kind: item.category,
      jobType: jobTypeByCategory[item.category],
      name: item.label,
      description: [item.detail, item.status].filter(Boolean).join(' · ') || '—',
      date: item.sortAt ? formatDate(item.sortAt) : '—',
      createdAt,
      createdAtMs,
      status: item.currentStep,
      phase: terminal ? 'completed' : 'in_progress',
    };
  });
}

export function rentReviewJobRows(
  reviews: RentReviewCase[],
  decisions: Record<string, RentReviewDecision | null | undefined>,
): PropertyJobRow[] {
  return reviews
    .filter((review) => !isDeletedRentReview(review))
    .map((review) => {
    const progress = rentReviewWorkflowProgress(review);
    const decision = decisions[review.id];
    const createdIso = rentReviewCreatedAtIso(review);
    const { createdAt, createdAtMs } = rowCreatedAt(createdIso);
    const dueDate = deriveRentReviewDueDateFromInput({
      leaseEnd: review.leaseEnd,
      reviewDue: review.reviewDue,
      newLeaseStart: review.leaseStart,
    });
    return {
      id: review.id,
      kind: 'rent_review',
      jobType: 'Rent review',
      name: workflowCaseReferenceLabel(review.id, 'rent_review'),
      description: formatRentReviewJobDescription(review, decision),
      date: dueDate ? formatDate(dueDate) : '—',
      createdAt,
      createdAtMs,
      status: progress.currentStepLabel,
      phase: isRentReviewDecided(review, decision) ? 'completed' : 'in_progress',
      rentReviewSchedule: getRentReviewScheduleIndicators(review) ?? undefined,
    };
  });
}

export function archivedRentReviewJobRows(
  items: ArchivedRentReview[],
  reviews: RentReviewCase[],
  decisions: Record<string, RentReviewDecision | null | undefined>,
): PropertyJobRow[] {
  return items.map((item) => {
    const review = reviews.find((r) => r.id === item.id);
    const createdIso = review ? rentReviewCreatedAtIso(review) : item.cancelledAt;
    const { createdAt, createdAtMs } = rowCreatedAt(createdIso);
    const dueDate = review
      ? deriveRentReviewDueDateFromInput({
          leaseEnd: review.leaseEnd,
          reviewDue: review.reviewDue,
          newLeaseStart: review.leaseStart,
        })
      : item.reviewDue;
    return {
      id: item.id,
      kind: 'rent_review',
      jobType: 'Rent review',
      name: workflowCaseReferenceLabel(item.id, 'rent_review'),
      description: review
        ? formatRentReviewJobDescription(review, decisions[review.id])
        : [
            item.currentRent != null ? `${formatCurrency(item.currentRent)}/wk` : null,
            item.cancelReason,
          ]
            .filter(Boolean)
            .join(' · ') || 'Cancelled',
      date: dueDate ? formatDate(dueDate) : '—',
      createdAt,
      createdAtMs,
      status: 'Deleted',
      phase: 'completed',
    };
  });
}

export function tribunalJobRows(cases: TribunalCase[]): PropertyJobRow[] {
  return cases.map((item) => {
    const progress = tribunalWorkflowProgress(item);
    const { createdAt, createdAtMs } = rowCreatedAt(tribunalCreatedAtIso(item));
    return {
      id: item.id,
      kind: 'tribunal',
      jobType: 'Tribunal',
      name: item.caseNumber ?? workflowCaseReferenceLabel(item.id, 'tribunal'),
      description: [item.tenantName, item.matter].filter(Boolean).join(' · ') || '—',
      date: item.hearingDate ? formatDateTime(item.hearingDate) : '—',
      createdAt,
      createdAtMs,
      status: progress.currentStepLabel,
      phase: item.status === 'closed' ? 'completed' : 'in_progress',
    };
  });
}

export function vacatingJobRows(cases: VacatingCase[]): PropertyJobRow[] {
  return cases.map((item) => {
    const progress = vacatingWorkflowProgress(item);
    const terminal = item.apiStatus?.toLowerCase().includes('completed');
    const createdIso = vacatingCreatedAtIso(item);
    const { createdAt, createdAtMs } = rowCreatedAt(createdIso);
    return {
      id: item.id,
      kind: 'end_leasing',
      jobType: 'End leasing',
      name: workflowCaseReferenceLabel(item.id, 'end_leasing'),
      description: `${item.reason} · ${item.checklistProgress}% checklist`,
      date: formatDate(item.vacateDate),
      createdAt,
      createdAtMs,
      status: progress.currentStepLabel,
      phase: terminal ? 'completed' : 'in_progress',
    };
  });
}

export function accountingJobRows(accounting?: PropertyAccounting | null): PropertyJobRow[] {
  if (!accounting || accounting.arrearsAmount <= 0) return [];
  return [
    {
      id: `arrears-${accounting.propertyId}`,
      kind: 'accounting',
      jobType: 'Accounting',
      name: 'Rent arrears',
      description: `${accounting.tenantName} · ${accounting.daysInArrears} days outstanding`,
      date: '—',
      createdAt: '—',
      createdAtMs: 0,
      status: 'Collection in progress',
      phase: 'in_progress',
    },
  ];
}

export function buildPropertyOverviewJobRows(input: {
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  leasingCases: PropertyLeasingWorkflowCase[];
  tribunalCases: TribunalCase[];
  vacatingCases: VacatingCase[];
  accounting?: PropertyAccounting | null;
}): PropertyJobRow[] {
  // Leasing workflow cases also surface rent reviews and end-leasing rows — those are
  // already represented by rentReviewJobRows / vacatingJobRows below.
  const leasingOnlyCases = input.leasingCases.filter((item) => item.category === 'leasing');
  const rows = dedupeJobRowsById([
    ...maintenanceJobRows(input.maintenance),
    ...inspectionJobRows(input.inspections),
    ...rentReviewJobRows(input.rentReviews, input.rentReviewDecisions),
    ...leasingWorkflowJobRows(leasingOnlyCases),
    ...tribunalJobRows(input.tribunalCases),
    ...vacatingJobRows(input.vacatingCases),
    ...accountingJobRows(input.accounting),
  ]);
  return splitPropertyJobRows(rows).inProgress;
}

function dedupeJobRowsById(rows: PropertyJobRow[]): PropertyJobRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}
