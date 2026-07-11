import {
  inspectionWorkflowProgress,
  maintenanceWorkflowProgress,
  rentReviewWorkflowProgress,
  tribunalWorkflowProgress,
  vacatingWorkflowProgress,
} from '@/lib/case-workflows';
import type { PropertyLeasingWorkflowCase } from '@/lib/property-leasing-workflow-cases';
import { isRentReviewDecided } from '@/lib/rent-review';
import type { RentReviewDecision } from '@/lib/rent-review';
import { getRentReviewScheduleIndicators } from '@/lib/rent-review/conduct-countdown';
import type { RentReviewScheduleIndicators } from '@/lib/rent-review/conduct-countdown';
import type {
  Inspection,
  MaintenanceRequest,
  PropertyAccounting,
  RentReviewCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { formatDate, formatDateTime, formatScheduledAt } from '@/lib/utils';
import { inspectionReferenceLabel, workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import {
  inspectionCreatedAtIso,
  maintenanceCreatedAtIso,
  rentReviewCreatedAtIso,
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

/** Display order for mixed job tables (overview, etc.). */
const PROPERTY_JOB_TYPE_ORDER: string[] = [
  'Leasing',
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

export function groupPropertyJobRows(
  rows: PropertyJobRow[],
  preserveOrder = false,
): { label: string; rows: PropertyJobRow[] }[] {
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
      status: progress.currentStepLabel,
      phase: isCompletedInspection(inspection) ? 'completed' : 'in_progress',
    };
  });
}

export function leasingWorkflowJobRows(cases: PropertyLeasingWorkflowCase[]): PropertyJobRow[] {
  const jobTypeByCategory: Record<PropertyLeasingWorkflowCase['category'], string> = {
    leasing: 'Leasing',
    rent_review: 'Rent review',
    end_leasing: 'End leasing',
  };

  return cases.map((item) => {
    const terminal =
      item.status?.toLowerCase().includes('completed') ||
      item.status?.toLowerCase().includes('closed') ||
      item.status?.toLowerCase().includes('cancelled');
    const { createdAt, createdAtMs } = rowCreatedAt(item.sortAt);
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
  return reviews.map((review) => {
    const progress = rentReviewWorkflowProgress(review);
    const decision = decisions[review.id];
    const createdIso = rentReviewCreatedAtIso(review);
    const { createdAt, createdAtMs } = rowCreatedAt(createdIso);
    return {
      id: review.id,
      kind: 'rent_review',
      jobType: 'Rent review',
      name: workflowCaseReferenceLabel(review.id, 'rent_review'),
      description: [
        review.tenantName,
        review.leaseType === 'periodic'
          ? 'Periodic'
          : review.fixedTermWeeks
            ? `Fixed · ${review.fixedTermWeeks} wks`
            : 'Fixed',
      ]
        .filter(Boolean)
        .join(' · ') || '—',
      date: formatDate(review.reviewDue),
      createdAt,
      createdAtMs,
      status: progress.currentStepLabel,
      phase: isRentReviewDecided(review, decision) ? 'completed' : 'in_progress',
      rentReviewSchedule: getRentReviewScheduleIndicators(review) ?? undefined,
    };
  });
}

export function tribunalJobRows(cases: TribunalCase[]): PropertyJobRow[] {
  return cases.map((item) => {
    const progress = tribunalWorkflowProgress(item);
    const { createdAt, createdAtMs } = rowCreatedAt(item.hearingDate);
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
    const createdIso = item.timeline[0]?.at;
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
