'use client';

import { useMemo, useState } from 'react';

import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyLeasingCaseWorkflowDialog } from '@/components/agent/property-leasing-case-workflow-dialog';
import { PropertyLeasingWorkflowActions } from '@/components/agent/property-leasing-workflow-actions';
import { LeasingTenancySummary } from '@/components/agent/leasing-tenancy-summary';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { workflowRentWeekly } from '@/lib/property-leasing-job';
import { leasingWorkflowJobRows } from '@/lib/property-job-rows';
import {
  buildPropertyLeasingWorkflowCases,
  filterLeasingTabWorkflowCases,
} from '@/lib/property-leasing-workflow-cases';
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
import type { PropertyLeasingWorkflowCase } from '@/lib/property-leasing-workflow-cases';

export function PropertyLeasingJobPanel({
  property,
  propertyId,
  tenantSelections,
  vacatingCases,
  outgoingInspection: _outgoingInspection,
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
      filterLeasingTabWorkflowCases(
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
      ),
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

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dialogCase, setDialogCase] = useState<PropertyLeasingWorkflowCase | null>(null);

  const handleRowClick = (id: string) => {
    setSelectedCaseId(id);
    const item = workflowCases.find((workflowCase) => workflowCase.id === id) ?? null;
    setDialogCase(item);
  };

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

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Letting cases</h3>
        <p className="text-muted-foreground text-xs">
          Click a case to open the full letting or end-leasing workflow.
        </p>
        <PropertyJobCasesTable
          rows={jobRows}
          selectedId={selectedCaseId}
          onRowClick={handleRowClick}
          showViewToggle
        />
      </section>

      <PropertyLeasingCaseWorkflowDialog
        open={dialogCase !== null}
        onClose={() => setDialogCase(null)}
        item={dialogCase}
        property={property}
        propertyId={propertyId}
        rentReviews={rentReviews}
        rentReviewDecisions={rentReviewDecisions}
        vacatingCases={vacatingCases}
        rentWeekly={rentWeekly}
        onViewRentReview={onViewRentReview}
        focusBond={leasingFocusBond && dialogCase?.category === 'leasing'}
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
