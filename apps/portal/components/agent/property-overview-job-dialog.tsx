'use client';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import {
  PropertyLeasingCaseWorkflowDialog,
} from '@/components/agent/property-leasing-case-workflow-dialog';
import { PropertyMaintenanceCaseDialog } from '@/components/agent/property-maintenance-case-dialog';
import { PropertyRentReviewCaseWorkflowDialog } from '@/components/agent/property-rent-review-case-workflow-dialog';
import { TribunalCaseDetailDialog } from '@/components/agent/tribunal-case-detail-dialog';
import { InspectionCaseDetailDialog } from '@/components/inspections/inspection-case-detail-dialog';
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
import { formatCurrency, formatDateTime } from '@/lib/utils';

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
    return (
      <TribunalCaseDetailDialog
        open={open}
        onClose={onClose}
        caseId={job.id}
        tribunalCase={tribunalCase}
      />
    );
  }

  if (job.kind === 'accounting' && accounting) {
    const billArrears =
      accounting.bills
        ?.filter((bill) => bill.status === 'outstanding')
        .reduce((sum, bill) => sum + bill.amount, 0) ?? 0;
    const debtCollection =
      accounting.collectionActivity?.map((event) => ({
        id: event.id,
        channel: event.type,
        timestamp: event.at,
        summary: event.detail ? `${event.summary} — ${event.detail}` : event.summary,
      })) ?? [];

    return (
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title={job.name}
        subtitle={job.status}
        size={JOB_CASE_DIALOG_SIZE}
      >
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-semibold">{accounting.tenantName}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{property.address}</p>
          </div>

          <dl className="grid gap-2 sm:grid-cols-2">
            {[
              { label: 'Paid YTD', value: formatCurrency(accounting.rentPaidYtd) },
              { label: 'Rent outstanding', value: formatCurrency(accounting.rentOutstanding) },
              { label: 'Current balance', value: formatCurrency(accounting.currentBalance) },
              {
                label: 'Rent arrears',
                value:
                  accounting.arrearsAmount > 0
                    ? `${formatCurrency(accounting.arrearsAmount)} · ${accounting.daysInArrears}d`
                    : 'None',
              },
              {
                label: 'Invoice arrears',
                value: billArrears > 0 ? formatCurrency(billArrears) : 'None',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border bg-muted/20 px-3 py-2.5">
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm font-medium tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>

          {debtCollection.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Arrears reminders</h3>
              <ul className="space-y-2">
                {debtCollection.map((event) => (
                  <li key={event.id} className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                        {event.channel}
                      </span>
                      <span className="text-muted-foreground text-[11px] tabular-nums">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1">{event.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </CaseDetailDialog>
    );
  }

  return null;
}
