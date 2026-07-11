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
import { getRentReviewConductCountdown } from '@/lib/rent-review/conduct-countdown';
import type { RentReviewConductCountdown } from '@/lib/rent-review/conduct-countdown';
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
  date: string;
  status: string;
  phase: PropertyJobPhase;
  /** 30-day conduct window countdown (rent review only). */
  conductCountdown?: RentReviewConductCountdown;
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
  const byDateDesc = (a: PropertyJobRow, b: PropertyJobRow) => b.date.localeCompare(a.date);
  return {
    inProgress: inProgress.sort(byDateDesc),
    completed: completed.sort(byDateDesc),
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

export function maintenanceJobRows(requests: MaintenanceRequest[]): PropertyJobRow[] {
  return requests.map((request) => {
    const progress = maintenanceWorkflowProgress(request);
    const created = request.timeline[0]?.at;
    return {
      id: request.id,
      kind: 'maintenance',
      jobType: 'Maintenance',
      name: request.trackingNumber || workflowCaseReferenceLabel(request.id, 'maintenance'),
      description: [
        request.title,
        request.responsibility !== 'pending'
          ? responsibilityLabelForRow(request.responsibility)
          : null,
        request.priority === 'urgent' || request.priority === 'high'
          ? request.priority
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      date: created ? formatDateTime(created) : '—',
      status: progress.currentStepLabel,
      phase: isCompletedMaintenance(request) ? 'completed' : 'in_progress',
    };
  });
}

export function inspectionJobRows(inspections: Inspection[]): PropertyJobRow[] {
  return inspections.map((inspection) => {
    const progress = inspectionWorkflowProgress(inspection);
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
      date: inspection.scheduledAt ? formatDate(inspection.scheduledAt) : '—',
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
    return {
      id: item.id,
      kind: item.category,
      jobType: jobTypeByCategory[item.category],
      name: item.label,
      description: [item.detail, item.status].filter(Boolean).join(' · ') || '—',
      date: item.sortAt ? formatDate(item.sortAt) : '—',
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
      status: progress.currentStepLabel,
      phase: isRentReviewDecided(review, decision) ? 'completed' : 'in_progress',
      conductCountdown: getRentReviewConductCountdown(review) ?? undefined,
    };
  });
}

export function tribunalJobRows(cases: TribunalCase[]): PropertyJobRow[] {
  return cases.map((item) => {
    const progress = tribunalWorkflowProgress(item);
    return {
      id: item.id,
      kind: 'tribunal',
      jobType: 'Tribunal',
      name: item.caseNumber ?? workflowCaseReferenceLabel(item.id, 'tribunal'),
      description: [item.tenantName, item.matter].filter(Boolean).join(' · ') || '—',
      date: item.hearingDate ? formatDateTime(item.hearingDate) : '—',
      status: progress.currentStepLabel,
      phase: item.status === 'closed' ? 'completed' : 'in_progress',
    };
  });
}

export function vacatingJobRows(cases: VacatingCase[]): PropertyJobRow[] {
  return cases.map((item) => {
    const progress = vacatingWorkflowProgress(item);
    const terminal = item.apiStatus?.toLowerCase().includes('completed');
    return {
      id: item.id,
      kind: 'end_leasing',
      jobType: 'End leasing',
      name: workflowCaseReferenceLabel(item.id, 'end_leasing'),
      description: `${item.reason} · ${item.checklistProgress}% checklist`,
      date: formatDate(item.vacateDate),
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
