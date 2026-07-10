'use client';

import { useMemo } from 'react';

import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyLeasingWorkflowActions } from '@/components/agent/property-leasing-workflow-actions';
import { LeasingTenancySummary } from '@/components/agent/leasing-tenancy-summary';
import { PropertyLeasingWorkflowShell } from '@/components/agent/property-leasing-workflow-shell';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { workflowRentWeekly } from '@/lib/property-leasing-job';
import { leasingWorkflowJobRows } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import type { RentReviewDecision } from '@/lib/rent-review';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';

export function PropertyLeasingJobPanel({
  property,
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
  inOpenInspectionPhase,
  isVacant,
  onViewRentReview,
  onWorkflowCreated,
  leasingFocusBond = false,
  leasingInitialCategory,
  onLeasingFocusBondHandled,
}: {
  property: Property;
  propertyId: string;
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  outgoingInspection?: Inspection;
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  currentLease?: LeasingRecord;
  leasingCycles: LeasingCycle[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  nextRentReviewDate?: string | null;
  nextRentReviewCase?: RentReviewCase | null;
  inOpenInspectionPhase?: boolean;
  isVacant?: boolean;
  onViewRentReview?: (reviewId: string) => void;
  onWorkflowCreated?: () => void;
  leasingFocusBond?: boolean;
  leasingInitialCategory?: import('@/lib/property-leasing-workflow-cases').PropertyLeasingWorkflowCategory;
  onLeasingFocusBondHandled?: () => void;
}) {
  const workflowCases = useMemo(
    () =>
      buildPropertyLeasingWorkflowCases({
        propertyId,
        leasingCycles,
        tenantSelections,
        vacatingCases,
        rentReviews,
        rentReviewDecisions,
        currentLease,
        inOpenInspectionPhase,
        isVacant,
      }),
    [
      propertyId,
      leasingCycles,
      tenantSelections,
      vacatingCases,
      rentReviews,
      rentReviewDecisions,
      currentLease,
      inOpenInspectionPhase,
      isVacant,
    ],
  );

  const rentWeekly = workflowRentWeekly({
    propertyRentWeekly: property.rentWeekly,
    tenantSelections,
    currentLease,
  });

  const jobRows = useMemo(() => leasingWorkflowJobRows(workflowCases), [workflowCases]);

  const workflowActions = (
    <PropertyLeasingWorkflowActions
      property={property}
      propertyId={propertyId}
      leasingCycles={leasingCycles}
      rentReviews={rentReviews}
      vacatingCases={vacatingCases}
      maintenance={maintenance}
      inspections={inspections}
      tribunalCases={tribunalCases}
      tenantSelections={tenantSelections}
      currentLease={currentLease}
      onCreated={onWorkflowCreated}
    />
  );

  const showCurrentTenancySummary =
    Boolean(currentLease) &&
    (vacatingCases.length > 0 || leasingCycles.length === 0);

  if (workflowCases.length === 0) {
    return (
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
        tenantSelections={tenantSelections}
        currentLease={currentLease}
        emptyTitle="No leasing activity yet"
        onCreated={onWorkflowCreated}
      />
    );
  }

  return (
    <div className="space-y-4">
      {workflowActions}

      <PropertyJobCasesTable rows={jobRows} showViewToggle />

      <PropertyLeasingWorkflowShell
        cases={workflowCases}
        property={property}
        propertyId={propertyId}
        rentReviews={rentReviews}
        rentReviewDecisions={rentReviewDecisions}
        vacatingCases={vacatingCases}
        rentWeekly={rentWeekly}
        onViewRentReview={onViewRentReview}
        initialCategory={leasingInitialCategory}
        focusBond={leasingFocusBond}
        onFocusBondHandled={onLeasingFocusBondHandled}
      />

      {showCurrentTenancySummary && currentLease ? (
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
      ) : null}
    </div>
  );
}