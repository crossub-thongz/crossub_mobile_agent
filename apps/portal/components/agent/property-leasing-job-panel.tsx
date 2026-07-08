'use client';

import { LeasingTenancySummary } from '@/components/agent/leasing-tenancy-summary';
import { LeasingQuickActions } from '@/components/agent/leasing-quick-actions';
import { LeasingWorkflowTimeline } from '@/components/leasing-workflow/leasing-workflow-timeline';
import { VacatingWorkflowTimeline } from '@/components/vacating-workflow/vacating-workflow-timeline';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { Button } from '@/components/ui/button';
import { rentReviewDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import type { PropertyLeasingJob } from '@/lib/property-leasing-job';
import { workflowRentWeekly } from '@/lib/property-leasing-job';
import { isRentReviewPendingApproval, type RentReviewDecision } from '@/lib/rent-review';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceItem,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { formatDate } from '@/lib/utils';

function PropertyLeasingJobHeader({
  job,
  propertyId,
  leaseId,
}: {
  job: PropertyLeasingJob;
  propertyId: string;
  leaseId?: string;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="min-w-0 flex-1 rounded-xl border bg-card px-4 py-3">
        <p className="text-primary text-[10px] font-semibold uppercase tracking-wide">Leasing job</p>
        <p className="mt-0.5 text-base font-semibold leading-tight">{job.title}</p>
        {job.subtitle ? (
          <p className="text-muted-foreground mt-1 text-sm">{job.subtitle}</p>
        ) : null}
      </div>
      <div className="w-[20%] min-w-[3.25rem] shrink-0">
        <LeasingQuickActions
          propertyId={propertyId}
          leaseId={leaseId}
          variant="compact"
          className="h-full"
        />
      </div>
    </div>
  );
}

export function PropertyLeasingJobPanel({
  property,
  job,
  propertyId,
  tenantSelections,
  vacatingCases,
  outgoingInspection,
  rentReviews,
  rentReviewDecisions,
  currentLease,
  leasingCycles,
  maintenance,
  inspections,
  tribunalCases,
  nextRentReviewDate,
  nextRentReviewCase,
  onViewRentReview,
  onWorkflowCreated,
}: {
  property: Property;
  job: PropertyLeasingJob;
  propertyId: string;
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  outgoingInspection?: Inspection;
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  currentLease?: LeasingRecord;
  leasingCycles: LeasingCycle[];
  maintenance: MaintenanceItem[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  nextRentReviewDate?: string | null;
  nextRentReviewCase?: RentReviewCase | null;
  onViewRentReview?: (reviewId: string) => void;
  onWorkflowCreated?: () => void;
}) {
  const rentWeekly = workflowRentWeekly({
    propertyRentWeekly: property.rentWeekly,
    tenantSelections,
    currentLease,
  });

  if (job.kind === 'new-leasing') {
    return (
      <div className="space-y-4">
        <PropertyLeasingJobHeader
          job={job}
          propertyId={propertyId}
          leaseId={currentLease?.id}
        />
        <LeasingWorkflowTimeline
          propertyId={propertyId}
          propertyAddress={property.address}
          rentWeekly={rentWeekly}
          hideSectionLabel
        />
      </div>
    );
  }

  if (job.kind === 'current-tenancy' && currentLease) {
    return (
      <div className="space-y-4">
        <PropertyLeasingJobHeader
          job={job}
          propertyId={propertyId}
          leaseId={currentLease?.id}
        />
        <LeasingWorkflowTimeline
          propertyId={propertyId}
          propertyAddress={property.address}
          rentWeekly={rentWeekly}
          hideSectionLabel
        />
        <LeasingTenancySummary
          propertyId={propertyId}
          lease={currentLease}
          nextRentReviewDate={nextRentReviewDate}
          onViewRentReview={
            nextRentReviewCase && onViewRentReview
              ? () => onViewRentReview(nextRentReviewCase.id)
              : undefined
          }
        />
      </div>
    );
  }

  if (job.kind === 'vacating') {
    const primaryCase = vacatingCases[0];
    if (!primaryCase) {
      return (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
          No active vacating case on this property.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        <PropertyLeasingJobHeader
          job={job}
          propertyId={propertyId}
          leaseId={currentLease?.id}
        />
        <VacatingWorkflowTimeline
          vacatingCase={primaryCase}
          outgoingInspection={outgoingInspection}
        />
      </div>
    );
  }

  if (job.kind === 'rent-review') {
    return (
      <div className="space-y-4">
        <PropertyLeasingJobHeader
          job={job}
          propertyId={propertyId}
          leaseId={currentLease?.id}
        />
        {rentReviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">No rent review cases for this property.</p>
        ) : (
          <div className="space-y-2">
            {rentReviews.map((r) => (
              <div key={r.id} className="space-y-2">
                <TaskStatusRow
                  asLink={false}
                  item={{
                    id: r.id,
                    propertyAddress: r.propertyAddress,
                    taskLabel: `Rent review · due ${formatDate(r.reviewDue)}`,
                    status: rentReviewDecisions[r.id]
                      ? rentReviewDecisions[r.id]?.action === 'confirmed'
                        ? 'Confirmed'
                        : 'Custom amount submitted'
                      : r.status,
                    href: rentReviewDetail(r.id, fromProperty(propertyId, 'Leasing')),
                    module: 'Rent review',
                    tone: isRentReviewPendingApproval(r, rentReviewDecisions[r.id])
                      ? 'warning'
                      : r.tenantResponse === 'counter'
                        ? 'neutral'
                        : 'ok',
                    requiresApproval: isRentReviewPendingApproval(r, rentReviewDecisions[r.id]),
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onViewRentReview?.(r.id)}
                >
                  View details
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel
        tab="leasing"
        property={property}
        propertyId={propertyId}
        leasingCycles={leasingCycles}
        rentReviews={rentReviews}
        vacatingCases={vacatingCases}
        maintenance={maintenance}
        inspections={inspections}
        tribunalCases={tribunalCases}
        currentLease={currentLease}
        emptyTitle="No leasing activity yet"
        onCreated={onWorkflowCreated}
      />
      <div className="flex items-stretch gap-2">
        <div className="min-w-0 flex-1 rounded-xl border border-dashed px-4 py-3">
          <p className="text-muted-foreground text-center text-sm">
            Use the actions above to start a workflow, or open quick actions.
          </p>
        </div>
        <div className="w-[20%] min-w-[3.25rem] shrink-0">
          <LeasingQuickActions
            propertyId={propertyId}
            leaseId={currentLease?.id}
            variant="compact"
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
