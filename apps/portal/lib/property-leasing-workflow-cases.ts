import { leasingLifecycleProgress } from '@/lib/case-workflows/leasing';
import { vacatingWorkflowProgress } from '@/lib/case-workflows/vacating';
import { isRentReviewPendingApproval, type RentReviewDecision } from '@/lib/rent-review';
import type {
  LeasingCycle,
  LeasingRecord,
  RentReviewCase,
  TenantSelectionCase,
  VacatingCase,
} from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export type PropertyLeasingWorkflowCategory = 'leasing' | 'rent_review' | 'end_leasing';

export interface PropertyLeasingWorkflowCase {
  id: string;
  category: PropertyLeasingWorkflowCategory;
  label: string;
  status?: string;
  currentStep: string;
  detail?: string;
  sortAt?: string;
}

function parseSortTimestamp(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isTerminalWorkflowStatus(status: string | undefined): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return (
    normalized.includes('completed') ||
    normalized.includes('closed') ||
    normalized.includes('cancelled')
  );
}

export function sortPropertyLeasingWorkflowCases(
  cases: PropertyLeasingWorkflowCase[],
): PropertyLeasingWorkflowCase[] {
  return [...cases].sort(
    (a, b) => parseSortTimestamp(b.sortAt) - parseSortTimestamp(a.sortAt),
  );
}

/** Build all leasing-tab workflow rows for a property — mirrors crossub_web portal leasing cases. */
export function buildPropertyLeasingWorkflowCases(input: {
  propertyId: string;
  leasingCycles: LeasingCycle[];
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  currentLease?: LeasingRecord;
  inOpenInspectionPhase?: boolean;
  isVacant?: boolean;
}): PropertyLeasingWorkflowCase[] {
  const {
    propertyId,
    leasingCycles,
    tenantSelections,
    vacatingCases,
    rentReviews,
    rentReviewDecisions,
    currentLease,
    inOpenInspectionPhase,
    isVacant,
  } = input;

  const cases: PropertyLeasingWorkflowCase[] = [];

  for (const cycle of leasingCycles) {
    const progress = leasingLifecycleProgress(cycle);
    cases.push({
      id: cycle.id,
      category: 'leasing',
      label: workflowCaseReferenceLabel(cycle.id, 'leasing'),
      status: cycle.lifecycleStep.replaceAll('_', ' ').toLowerCase(),
      currentStep: progress.currentStepLabel,
      detail: cycle.propertyAddress,
      sortAt: cycle.availableFrom,
    });
  }

  if (
    leasingCycles.length === 0 &&
    (tenantSelections.length > 0 || (inOpenInspectionPhase && isVacant))
  ) {
    const pending = tenantSelections.find((t) => t.requiresApproval);
    const primary = pending ?? tenantSelections[0];
    cases.push({
      id: primary?.id ?? `leasing-${propertyId}`,
      category: 'leasing',
      label: workflowCaseReferenceLabel(primary?.id ?? propertyId, 'leasing'),
      status: primary ? 'tenant selection' : 'new leasing',
      currentStep: primary ? 'Application approval' : 'Open inspection',
      detail: primary?.applicantName,
    });
  }

  for (const vacating of vacatingCases) {
    if (isTerminalWorkflowStatus(vacating.apiStatus)) continue;
    const progress = vacatingWorkflowProgress(vacating);
    cases.push({
      id: vacating.id,
      category: 'end_leasing',
      label: workflowCaseReferenceLabel(vacating.id, 'end_leasing'),
      status: vacating.apiStatus?.replaceAll('_', ' ').toLowerCase(),
      currentStep: progress.currentStepLabel,
      detail: `Vacate ${vacating.vacateDate} · ${vacating.reason}`,
      sortAt: vacating.vacateDate,
    });
  }

  for (const review of rentReviews) {
    if (isTerminalWorkflowStatus(review.status)) continue;
    cases.push({
      id: review.id,
      category: 'rent_review',
      label: workflowCaseReferenceLabel(review.id, 'rent_review'),
      status: rentReviewDecisions[review.id]
        ? rentReviewDecisions[review.id]?.action === 'confirmed'
          ? 'confirmed'
          : 'custom amount'
        : review.status.toLowerCase(),
      currentStep: isRentReviewPendingApproval(review, rentReviewDecisions[review.id])
        ? 'Awaiting agent confirmation'
        : 'Rent review',
      detail: review.propertyAddress,
      sortAt: review.reviewDue,
    });
  }

  if (
    cases.length === 0 &&
    currentLease &&
    !isVacant
  ) {
    cases.push({
      id: currentLease.id,
      category: 'leasing',
      label: workflowCaseReferenceLabel(currentLease.id, 'leasing'),
      status: 'current tenancy',
      currentStep: 'Active lease',
      detail: currentLease.approvedTenant,
    });
  }

  return sortPropertyLeasingWorkflowCases(cases);
}

export const LEASING_CATEGORY_LABEL: Record<PropertyLeasingWorkflowCategory, string> = {
  leasing: 'New leasing',
  rent_review: 'Rent review',
  end_leasing: 'End leasing',
};

export const LEASING_WORKFLOW_CATEGORIES: PropertyLeasingWorkflowCategory[] = [
  'leasing',
  'end_leasing',
  'rent_review',
];

/** Leasing tab — new letting and end leasing only (rent review has its own tab). */
export const LEASING_TAB_WORKFLOW_CATEGORIES: PropertyLeasingWorkflowCategory[] = [
  'leasing',
  'end_leasing',
];

export function filterLeasingTabWorkflowCases(
  cases: PropertyLeasingWorkflowCase[],
): PropertyLeasingWorkflowCase[] {
  return cases.filter((item) => item.category !== 'rent_review');
}
