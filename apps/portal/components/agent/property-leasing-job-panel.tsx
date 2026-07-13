'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import {
  ArchivedEndLeasingTable,
  ArchivedLeasingCyclesTable,
} from '@/components/agent/archive-module-tables';
import { EmptyState } from '@/components/agent/empty-state';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyLeasingCaseWorkflowDialog } from '@/components/agent/property-leasing-case-workflow-dialog';
import { PropertyLeasingWorkflowActions } from '@/components/agent/property-leasing-workflow-actions';
import { LeasingTenancySummary } from '@/components/agent/leasing-tenancy-summary';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  cancelAgentLeasingCycle,
  cancelAgentTerminationCase,
} from '@/lib/crossub-api/agent-workflow-client';
import { workflowRentWeekly } from '@/lib/property-leasing-job';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import { leasingWorkflowJobRows } from '@/lib/property-job-rows';
import {
  buildPropertyLeasingHistoryCases,
  buildPropertyLeasingWorkflowCases,
  filterLeasingTabWorkflowCases,
  type PropertyLeasingWorkflowCase,
} from '@/lib/property-leasing-workflow-cases';
import { isWorkflowCreatedCase, type PropertyWorkflowCreatedResult } from '@/lib/property-workflow-created';
import type { RentReviewDecision } from '@/lib/rent-review';
import type {
  ArchivedEndLeasingCase,
  ArchivedLeasingCycle,
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
  onOpenInspectionCreated,
  deletedLeasingCycles = [],
  deletedEndLeasingCases = [],
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
  onOpenInspectionCreated?: (inspectionId: string) => void;
  deletedLeasingCycles?: ArchivedLeasingCycle[];
  deletedEndLeasingCases?: ArchivedEndLeasingCase[];
}) {
  const { apiConnected, refresh } = useAgentData();
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
  const historyCases = useMemo(
    () =>
      buildPropertyLeasingHistoryCases({
        propertyId,
        leasingCycles,
        vacatingCases,
      }),
    [leasingCycles, propertyId, vacatingCases],
  );
  const historyJobRows = useMemo(() => leasingWorkflowJobRows(historyCases), [historyCases]);

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dialogCase, setDialogCase] = useState<PropertyLeasingWorkflowCase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PropertyLeasingWorkflowCase | null>(null);
  const [pendingOpenCaseId, setPendingOpenCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingOpenCaseId) return;
    const item =
      workflowCases.find((workflowCase) => workflowCase.id === pendingOpenCaseId) ??
      historyCases.find((workflowCase) => workflowCase.id === pendingOpenCaseId) ??
      null;
    if (!item) return;
    setSelectedCaseId(item.id);
    setDialogCase(item);
    setPendingOpenCaseId(null);
  }, [historyCases, pendingOpenCaseId, workflowCases]);

  const handleWorkflowCreated = useCallback(
    async (result?: PropertyWorkflowCreatedResult) => {
      await refresh();
      onWorkflowCreated?.();
      if (result && isWorkflowCreatedCase(result)) {
        setPendingOpenCaseId(result.id);
      }
    },
    [onWorkflowCreated, refresh],
  );

  const canDeleteCase = useCallback(
    (item: PropertyLeasingWorkflowCase) => {
      if (!apiConnected) return false;
      if (item.category === 'leasing') {
        return leasingCycles.some((cycle) => cycle.id === item.id);
      }
      if (item.category === 'end_leasing') {
        const vacating = vacatingCases.find((v) => v.id === item.id);
        if (!vacating) return false;
        const status = vacating.apiStatus?.toLowerCase() ?? '';
        return !status.includes('cancelled') && !status.includes('completed');
      }
      return false;
    },
    [apiConnected, leasingCycles, vacatingCases],
  );

  const canDeleteRow = useCallback(
    (row: PropertyJobRow) => {
      const item = workflowCases.find((workflowCase) => workflowCase.id === row.id);
      return item ? canDeleteCase(item) : false;
    },
    [canDeleteCase, workflowCases],
  );

  const handleDeleteConfirm = async (reason: string) => {
    if (!deleteTarget) return;
    if (!apiConnected) {
      throw new Error('Connect to the API to delete cases');
    }
    if (deleteTarget.category === 'leasing') {
      await cancelAgentLeasingCycle(propertyId, deleteTarget.id, { reason, force: true });
    } else if (deleteTarget.category === 'end_leasing') {
      await cancelAgentTerminationCase(propertyId, deleteTarget.id, { reason });
    } else {
      throw new Error('This case type cannot be deleted here');
    }
    toast.success('Case deleted');
    setDialogCase(null);
    setSelectedCaseId(null);
    await refresh();
    onWorkflowCreated?.();
  };

  const handleRowClick = (id: string) => {
    setSelectedCaseId(id);
    const item =
      workflowCases.find((workflowCase) => workflowCase.id === id) ??
      historyCases.find((workflowCase) => workflowCase.id === id) ??
      null;
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
      onCreated={handleWorkflowCreated}
    />
  );

  const showCurrentTenancySummary =
    Boolean(currentLease) &&
    (vacatingCases.length > 0 || leasingCycles.length === 0);

  if (workflowCases.length === 0) {
    const hasDeleted =
      deletedLeasingCycles.length > 0 || deletedEndLeasingCases.length > 0;

    if (!hasDeleted) {
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
          onCreated={handleWorkflowCreated}
        />
      );
    }

    return (
      <div className="space-y-4">
        {workflowActions}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Deleted</h3>
          <p className="text-muted-foreground text-xs">
            Cancelled letting and end-leasing cases for this property, with the reason recorded at
            deletion.
          </p>
          {deletedLeasingCycles.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                New letting
              </p>
              <ArchivedLeasingCyclesTable items={deletedLeasingCycles} />
            </div>
          ) : null}
          {deletedEndLeasingCases.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                End leasing
              </p>
              <ArchivedEndLeasingTable items={deletedEndLeasingCases} />
            </div>
          ) : null}
        </section>
      </div>
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
          canDeleteRow={canDeleteRow}
          onDeleteRow={(row) => {
            const item = workflowCases.find((workflowCase) => workflowCase.id === row.id);
            if (item) setDeleteTarget(item);
          }}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">History</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Completed end-leasing cases and past letting cycles — click a row to reopen the workflow.
          </p>
        </div>
        {historyJobRows.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No leasing history"
            description="Completed end-leasing cases and past letting cycles will appear here."
          />
        ) : (
          <PropertyJobCasesTable
            rows={historyJobRows}
            selectedId={selectedCaseId}
            onRowClick={handleRowClick}
            showViewToggle
          />
        )}
      </section>

      {(deletedLeasingCycles.length > 0 || deletedEndLeasingCases.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Deleted</h3>
          <p className="text-muted-foreground text-xs">
            Cancelled letting and end-leasing cases for this property, with the reason recorded at
            deletion.
          </p>
          {deletedLeasingCycles.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                New letting
              </p>
              <ArchivedLeasingCyclesTable items={deletedLeasingCycles} />
            </div>
          ) : null}
          {deletedEndLeasingCases.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                End leasing
              </p>
              <ArchivedEndLeasingTable items={deletedEndLeasingCases} />
            </div>
          ) : null}
        </section>
      )}

      <WorkflowCaseDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={
          deleteTarget?.category === 'end_leasing' ? 'Delete end-leasing case' : 'Delete letting case'
        }
        description="The case moves to the Deleted section below and the global Archive. A reason is required."
        onConfirm={handleDeleteConfirm}
        onSuccess={() => setDeleteTarget(null)}
      />

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
        onCaseClosed={() => {
          void refresh().then(() => {
            setDialogCase(null);
            setSelectedCaseId(null);
            onWorkflowCreated?.();
          });
        }}
        onOpenInspectionCreated={(inspectionId) => {
          setDialogCase(null);
          setSelectedCaseId(null);
          onOpenInspectionCreated?.(inspectionId);
        }}
        canDeleteCase={canDeleteCase}
        onDeleteCase={(item) => setDeleteTarget(item)}
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
