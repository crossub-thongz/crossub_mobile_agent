'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { RentReconciliationCaseDialog } from '@/components/accounting/rent-reconciliation-case-dialog';
import {
  PropertyLeasingCaseWorkflowDialog,
} from '@/components/agent/property-leasing-case-workflow-dialog';
import { PropertyMaintenanceCaseDialog } from '@/components/agent/property-maintenance-case-dialog';
import { PropertyRentReviewCaseWorkflowDialog } from '@/components/agent/property-rent-review-case-workflow-dialog';
import { RentChasingArrearsDialog } from '@/components/agent/rent-chasing-arrears-dialog';
import { TribunalCaseDetailDialog } from '@/components/agent/tribunal-case-detail-dialog';
import { InspectionCaseDetailDialog } from '@/components/inspections/inspection-case-detail-dialog';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { fromProperty } from '@/lib/detail-navigation';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import { hasDedicatedV2TaskPage, relatedPropertyJobHref } from '@/lib/property-job-href';
import type { PropertyLeasingWorkflowCase } from '@/lib/property-leasing-workflow-cases';
import { workflowRentWeekly } from '@/lib/property-leasing-job';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import type { RentReviewDecision } from '@/lib/rent-review';
import type {
  Inspection,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';

function profileTabForJobKind(kind: PropertyJobRow['kind']): string {
  switch (kind) {
    case 'maintenance':
      return 'Maintenance';
    case 'inspection':
      return 'Inspection';
    case 'rent_review':
      return 'RentReview';
    case 'leasing':
    case 'end_leasing':
      return 'Leasing';
    case 'tribunal':
      return 'Tribunal';
    default:
      return 'Overview';
  }
}

export function PropertyOverviewJobDialog({
  job,
  onClose,
  property,
  propertyId,
  maintenance,
  rentReviews,
  rentReviewDecisions,
  leasingCases,
  vacatingCases,
  tribunalCases,
  accounting,
  tenantSelections,
  currentLease,
  onViewRentReview,
  onOpenInspectionCreated,
}: {
  job: PropertyJobRow | null;
  onClose: () => void;
  property: Property;
  propertyId: string;
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  leasingCases: PropertyLeasingWorkflowCase[];
  vacatingCases: VacatingCase[];
  tribunalCases: TribunalCase[];
  accounting?: PropertyAccounting | null;
  tenantSelections?: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  onViewRentReview?: (reviewId: string) => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  const router = useRouter();
  const isV2 = useIsAgentUiV2();
  const open = job != null;

  useEffect(() => {
    if (!isV2 || !job || !hasDedicatedV2TaskPage(job.kind)) return;
    router.replace(relatedPropertyJobHref(job, propertyId));
    onClose();
  }, [isV2, job, onClose, propertyId, router]);

  if (!job) {
    return null;
  }

  if (isV2 && hasDedicatedV2TaskPage(job.kind)) {
    return null;
  }

  if (job.kind === 'rent_review') {
    const review = rentReviews.find((item) => item.id === job.id) ?? null;
    return (
      <PropertyRentReviewCaseWorkflowDialog
        open={open}
        onClose={onClose}
        review={review}
      />
    );
  }

  if (job.kind === 'inspection') {
    return (
      <InspectionCaseDetailDialog
        open={open}
        onClose={onClose}
        inspectionId={job.id}
        navContext={fromProperty(propertyId, profileTabForJobKind(job.kind))}
        size={JOB_CASE_DIALOG_SIZE}
      />
    );
  }

  if (job.kind === 'maintenance') {
    const request = maintenance.find((item) => item.id === job.id) ?? null;
    return (
      <PropertyMaintenanceCaseDialog
        open={open}
        onClose={onClose}
        request={request}
        property={property}
        propertyId={propertyId}
      />
    );
  }

  if (job.kind === 'leasing' || job.kind === 'end_leasing') {
    const workflowCase = leasingCases.find((item) => item.id === job.id) ?? null;
    if (!workflowCase) return null;

    const rentWeekly = workflowRentWeekly({
      propertyRentWeekly: property.rentWeekly,
      tenantSelections: tenantSelections ?? [],
      currentLease,
    });

    return (
      <PropertyLeasingCaseWorkflowDialog
        open={open}
        onClose={onClose}
        item={workflowCase}
        property={property}
        propertyId={propertyId}
        rentReviews={rentReviews}
        rentReviewDecisions={rentReviewDecisions}
        vacatingCases={vacatingCases}
        rentWeekly={rentWeekly}
        onViewRentReview={onViewRentReview}
        onOpenInspectionCreated={onOpenInspectionCreated}
      />
    );
  }

  if (job.kind === 'tribunal') {
    const tribunalCase = tribunalCases.find((item) => item.id === job.id) ?? null;
    return (
      <TribunalCaseDetailDialog
        open={open}
        onClose={onClose}
        caseId={job.id}
        tribunalCase={tribunalCase}
      />
    );
  }

  if (job.kind === 'accounting') {
    if (job.id.startsWith('recon-')) {
      return (
        <RentReconciliationCaseDialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) onClose();
          }}
          propertyId={propertyId}
          property={property}
          fallbackAccounting={accounting}
        />
      );
    }

    return (
      <RentChasingArrearsDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
        propertyId={propertyId}
        subtitle={job.status}
      />
    );
  }

  return null;
}
