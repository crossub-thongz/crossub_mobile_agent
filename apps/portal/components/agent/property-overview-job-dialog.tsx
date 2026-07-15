'use client';

import Link from 'next/link';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { InspectionDetailDialog } from '@/components/agent/inspection-detail-dialog';
import { PropertyLeasingCaseWorkflowContent } from '@/components/agent/property-leasing-case-workflow-dialog';
import { PropertyMaintenanceJobPanel } from '@/components/agent/property-maintenance-job-panel';
import { RentReviewWorkflowTimeline } from '@/components/rent-review/rent-review-workflow-timeline';
import { Button } from '@/components/ui/button';
import { VacatingWorkflowTimeline } from '@/components/vacating-workflow/vacating-workflow-timeline';
import { tribunalDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
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
import { JOB_CASE_DIALOG_SIZE, END_LEASING_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';

export function PropertyOverviewJobDialog({
  job,
  onClose,
  property,
  propertyId,
  maintenance,
  inspections,
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
    if (!review) return null;
    return (
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title="Rent review"
        subtitle={`${job.name} · ${job.status}`}
        size={JOB_CASE_DIALOG_SIZE}
      >
        <RentReviewWorkflowTimeline review={review} />
      </CaseDetailDialog>
    );
  }

  if (job.kind === 'inspection') {
    const inspection = inspections.find((item) => item.id === job.id) ?? null;
    return (
      <InspectionDetailDialog
        open={open}
        onClose={onClose}
        inspection={inspection}
        navContext={fromProperty(propertyId, 'Overview')}
        size={JOB_CASE_DIALOG_SIZE}
      />
    );
  }

  if (job.kind === 'maintenance') {
    const request = maintenance.find((item) => item.id === job.id) ?? null;
    if (!request) return null;
    return (
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title="Maintenance"
        subtitle={`${job.name} · ${job.status}`}
        size={JOB_CASE_DIALOG_SIZE}
      >
        <PropertyMaintenanceJobPanel
          item={request}
          property={property}
          propertyId={propertyId}
        />
      </CaseDetailDialog>
    );
  }

  if (job.kind === 'leasing') {
    const workflowCase = leasingCases.find((item) => item.id === job.id) ?? null;
    if (!workflowCase) return null;

    const rentWeekly = workflowRentWeekly({
      propertyRentWeekly: property.rentWeekly,
      tenantSelections,
      currentLease,
    });

    return (
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title={job.jobType}
        subtitle={`${job.name} · ${job.status}`}
        size={JOB_CASE_DIALOG_SIZE}
      >
        <PropertyLeasingCaseWorkflowContent
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
      </CaseDetailDialog>
    );
  }

  if (job.kind === 'end_leasing') {
    const vacatingCase = vacatingCases.find((item) => item.id === job.id) ?? null;
    if (!vacatingCase) return null;
    return (
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title="End leasing"
        subtitle={`${job.name} · ${job.status}`}
        size={END_LEASING_CASE_DIALOG_SIZE}
      >
        <VacatingWorkflowTimeline vacatingCase={vacatingCase} />
      </CaseDetailDialog>
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
              href={tribunalDetail(tribunalCase.id, fromProperty(propertyId, 'Overview'))}
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
