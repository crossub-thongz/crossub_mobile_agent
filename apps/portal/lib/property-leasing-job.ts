import { isRentReviewPendingApproval, type RentReviewDecision } from '@/lib/rent-review';
import type {
  LeasingRecord,
  RentReviewCase,
  TenantSelectionCase,
  VacatingCase,
} from '@/lib/types';

export type PropertyLeasingJobKind =
  | 'new-leasing'
  | 'vacating'
  | 'rent-review'
  | 'current-tenancy'
  | 'none';

export interface PropertyLeasingJob {
  kind: PropertyLeasingJobKind;
  title: string;
  subtitle?: string;
}

export function resolvePropertyLeasingJob(input: {
  isVacant: boolean;
  inOpenInspectionPhase: boolean;
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  currentLease?: LeasingRecord;
}): PropertyLeasingJob {
  const {
    isVacant,
    inOpenInspectionPhase,
    tenantSelections,
    vacatingCases,
    rentReviews,
    rentReviewDecisions,
    currentLease,
  } = input;

  if (isVacant || inOpenInspectionPhase || tenantSelections.length > 0) {
    const pending = tenantSelections.find((t) => t.requiresApproval);
    const primary = pending ?? tenantSelections[0];
    return {
      kind: 'new-leasing',
      title: primary ? 'Tenant Selection' : 'New Leasing',
      subtitle: primary?.applicantName,
    };
  }

  if (vacatingCases.length > 0) {
    return {
      kind: 'vacating',
      title: 'Vacating',
      subtitle: vacatingCases[0].reason,
    };
  }

  const pendingRentReview = rentReviews.find((r) =>
    isRentReviewPendingApproval(r, rentReviewDecisions[r.id]),
  );
  if (pendingRentReview) {
    return {
      kind: 'rent-review',
      title: 'Rent Review',
      subtitle: pendingRentReview.propertyAddress,
    };
  }

  if (currentLease) {
    return {
      kind: 'current-tenancy',
      title: 'Current Tenancy',
      subtitle: currentLease.approvedTenant,
    };
  }

  return { kind: 'none', title: 'Leasing' };
}

export function workflowRentWeekly(input: {
  propertyRentWeekly: number;
  tenantSelections: TenantSelectionCase[];
  currentLease?: LeasingRecord;
}): number | undefined {
  if (input.currentLease?.rentWeekly) return input.currentLease.rentWeekly;
  if (input.tenantSelections[0]?.proposedRent) return input.tenantSelections[0].proposedRent;
  if (input.propertyRentWeekly > 0) return input.propertyRentWeekly;
  return undefined;
}
