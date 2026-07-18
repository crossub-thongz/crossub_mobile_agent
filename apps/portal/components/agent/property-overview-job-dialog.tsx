'use client';

import Link from 'next/link';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import {
  PropertyLeasingCaseWorkflowDialog,
} from '@/components/agent/property-leasing-case-workflow-dialog';
import { PropertyMaintenanceCaseDialog } from '@/components/agent/property-maintenance-case-dialog';
import { PropertyRentReviewCaseWorkflowDialog } from '@/components/agent/property-rent-review-case-workflow-dialog';
import { InspectionCaseDetailDialog } from '@/components/inspections/inspection-case-detail-dialog';
import { Button } from '@/components/ui/button';
import { tribunalDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
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
import { formatCurrency } from '@/lib/utils';

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
  const open = job != null;

  if (!job) {
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
      tenantSelections,
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
    if (!tribunalCase) return null;
    return (
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title="Tribunal"
        subtitle={`${job.name} · ${job.status}`}
        size={JOB_CASE_DIALOG_SIZE}
      >
        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <p className="font-semibold">{tribunalCase.matter}</p>
          <p className="text-muted-foreground text-xs">
            {tribunalCase.tenantName} · {tribunalCase.status}
          </p>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link
              href={tribunalDetail(tribunalCase.id, fromProperty(propertyId, 'Tribunal'))}
              onClick={onClose}
            >
              Open tribunal case
            </Link>
          </Button>
        </div>
      </CaseDetailDialog>
    );
  }

  if (job.kind === 'accounting' && accounting) {
    return (
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title="Rent arrears"
        subtitle={job.status}
        size={JOB_CASE_DIALOG_SIZE}
      >
        <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
          <p className="font-semibold">{accounting.tenantName}</p>
          <p className="text-muted-foreground text-xs">
            {formatCurrency(accounting.arrearsAmount)} outstanding · {accounting.daysInArrears}{' '}
            days in arrears
          </p>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/properties/${propertyId}?tab=Accounting&focus=arrears`} onClick={onClose}>
              Open accounting
            </Link>
          </Button>
        </div>
      </CaseDetailDialog>
    );
  }

  return null;
}
