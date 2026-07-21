'use client';

import { useMemo, useState } from 'react';

import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyOverviewJobDialog } from '@/components/agent/property-overview-job-dialog';
import { buildPropertyOverviewJobRows, type PropertyJobRow } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { isPropertyVacant } from '@/lib/property-leasing';
import type {
  AgentDocument,
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
} from '@/lib/types';

function OverviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function PropertyOverviewTab({
  property,
  propertyId,
  maintenance,
  inspections,
  propertyDocs: _propertyDocs,
  leasing,
  currentLease,
  rentReviewDecisions,
  tenancyRentReviews,
  leasingCycles,
  tenantSelections,
  vacatingCases = [],
  tribunalCases = [],
  accounting,
  onRefresh: _onRefresh,
  onViewBondLodgement: _onViewBondLodgement,
  onViewRentReview,
  onOpenInspectionCreated,
}: {
  property: Property;
  propertyId: string;
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  propertyDocs: AgentDocument[];
  leasing: LeasingRecord[];
  currentLease?: LeasingRecord;
  rentReviewDecisions: Record<string, { action: 'confirmed' | 'custom'; amount?: number } | null>;
  tenancyRentReviews: import('@/lib/types').RentReviewCase[];
  leasingCycles?: LeasingCycle[];
  tenantSelections?: import('@/lib/types').TenantSelectionCase[];
  vacatingCases?: import('@/lib/types').VacatingCase[];
  tribunalCases?: import('@/lib/types').TribunalCase[];
  accounting?: import('@/lib/types').PropertyAccounting | null;
  onRefresh?: () => void;
  onViewBondLodgement?: () => void;
  onViewRentReview?: (reviewId: string) => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  const [selectedJob, setSelectedJob] = useState<PropertyJobRow | null>(null);

  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : leasing);

  const leasingWorkflowCases = useMemo(
    () =>
      buildPropertyLeasingWorkflowCases({
        propertyId,
        leasingCycles: leasingCycles ?? [],
        tenantSelections: tenantSelections ?? [],
        vacatingCases,
        rentReviews: tenancyRentReviews,
        rentReviewDecisions,
        currentLease,
        isVacant,
      }),
    [
      propertyId,
      leasingCycles,
      tenantSelections,
      vacatingCases,
      tenancyRentReviews,
      rentReviewDecisions,
      currentLease,
      isVacant,
    ],
  );

  const inProgressJobs = useMemo(
    () =>
      buildPropertyOverviewJobRows({
        maintenance,
        inspections,
        rentReviews: tenancyRentReviews,
        rentReviewDecisions,
        leasingCases: leasingWorkflowCases,
        tribunalCases,
        vacatingCases,
        accounting,
      }),
    [
      maintenance,
      inspections,
      tenancyRentReviews,
      rentReviewDecisions,
      leasingWorkflowCases,
      tribunalCases,
      vacatingCases,
      accounting,
    ],
  );

  const handleJobClick = (id: string) => {
    const job = inProgressJobs.find((row) => row.id === id) ?? null;
    setSelectedJob(job);
  };

  return (
    <div className="space-y-3">
      <OverviewSection title="Jobs in progress">
        <p className="text-muted-foreground mb-2 text-[11px]">
          Choose a job type from the dropdown to view active jobs, then click a row to open the
          workflow.
        </p>
        <PropertyJobCasesTable
          rows={inProgressJobs}
          showViewToggle={false}
          groupByJobType
          requireJobTypeFilterSelection
          showRentReviewSchedule={false}
          selectedId={selectedJob?.id}
          onRowClick={handleJobClick}
          emptyTitle="No jobs in progress"
          emptyDescription="Active maintenance, inspections, leasing, and other cases appear here."
        />
      </OverviewSection>

      <PropertyOverviewJobDialog
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        property={property}
        propertyId={propertyId}
        maintenance={maintenance}
        inspections={inspections}
        rentReviews={tenancyRentReviews}
        rentReviewDecisions={rentReviewDecisions}
        leasingCases={leasingWorkflowCases}
        vacatingCases={vacatingCases}
        tribunalCases={tribunalCases}
        accounting={accounting}
        tenantSelections={tenantSelections}
        currentLease={currentLease}
        onViewRentReview={(reviewId) => {
          setSelectedJob(null);
          onViewRentReview?.(reviewId);
        }}
        onOpenInspectionCreated={(inspectionId) => {
          setSelectedJob(null);
          onOpenInspectionCreated?.(inspectionId);
        }}
      />
    </div>
  );
}
