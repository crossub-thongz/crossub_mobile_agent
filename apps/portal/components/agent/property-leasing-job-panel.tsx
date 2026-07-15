'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import {
  LeasingCyclesTable,
  TenantSelectionsTable,
} from '@/components/agent/portfolio-module-tables';
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
import {
  archivedEndLeasingJobRows,
  archivedLeasingCycleJobRows,
  leasingWorkflowJobRows,
} from '@/lib/property-job-rows';
import {
  buildPropertyLeasingHistoryCases,
  buildPropertyLeasingWorkflowCases,
  filterLeasingTabWorkflowCases,
  type PropertyLeasingWorkflowCase,
} from '@/lib/property-leasing-workflow-cases';
import { splitLeasingCyclesByHistory } from '@/lib/property-leasing-history';
import {
  LEASING_HISTORY_CATEGORY_FILTERS,
  PROPERTY_HISTORY_SCOPE_FILTERS,
  type LeasingHistoryCategory,
  type PropertyHistoryScope,
} from '@/lib/property-history-scope';
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

function sortJobRowsByCreatedDesc(rows: PropertyJobRow[]): PropertyJobRow[] {
  return [...rows].sort((a, b) => b.createdAtMs - a.createdAtMs);
}

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

  const { active: activeLeasingCycles } = useMemo(
    () => splitLeasingCyclesByHistory(leasingCycles),
    [leasingCycles],
  );
  const activeLeasingCycleIds = useMemo(
    () => new Set(activeLeasingCycles.map((cycle) => cycle.id)),
    [activeLeasingCycles],
  );
  const newLeasingCases = useMemo(
    () => workflowCases.filter((workflowCase) => workflowCase.category === 'leasing'),
    [workflowCases],
  );
  const endLeasingCases = useMemo(
    () => workflowCases.filter((workflowCase) => workflowCase.category === 'end_leasing'),
    [workflowCases],
  );
  const newLeasingJobRows = useMemo(
    () => leasingWorkflowJobRows(newLeasingCases),
    [newLeasingCases],
  );
  const endLeasingJobRows = useMemo(
    () => leasingWorkflowJobRows(endLeasingCases),
    [endLeasingCases],
  );
  const supplementalNewLeasingJobRows = useMemo(
    () => newLeasingJobRows.filter((row) => !activeLeasingCycleIds.has(row.id)),
    [activeLeasingCycleIds, newLeasingJobRows],
  );
  const historyCases = useMemo(
    () =>
      buildPropertyLeasingHistoryCases({
        propertyId,
        leasingCycles,
        vacatingCases,
      }),
    [leasingCycles, propertyId, vacatingCases],
  );
  const historyNewLeasingCases = useMemo(
    () => historyCases.filter((workflowCase) => workflowCase.category === 'leasing'),
    [historyCases],
  );
  const historyEndLeasingCases = useMemo(
    () => historyCases.filter((workflowCase) => workflowCase.category === 'end_leasing'),
    [historyCases],
  );
  const historyNewLeasingJobRows = useMemo(
    () => leasingWorkflowJobRows(historyNewLeasingCases),
    [historyNewLeasingCases],
  );
  const historyEndLeasingJobRows = useMemo(
    () => leasingWorkflowJobRows(historyEndLeasingCases),
    [historyEndLeasingCases],
  );
  const deletedNewLeasingJobRows = useMemo(
    () => sortJobRowsByCreatedDesc(archivedLeasingCycleJobRows(deletedLeasingCycles)),
    [deletedLeasingCycles],
  );
  const deletedEndLeasingJobRows = useMemo(
    () => sortJobRowsByCreatedDesc(archivedEndLeasingJobRows(deletedEndLeasingCases)),
    [deletedEndLeasingCases],
  );
  const propertyTenantSelections = useMemo(
    () => tenantSelections.filter((selection) => selection.propertyId === propertyId),
    [propertyId, tenantSelections],
  );

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dialogCase, setDialogCase] = useState<PropertyLeasingWorkflowCase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PropertyLeasingWorkflowCase | null>(null);
  const [pendingOpenCaseId, setPendingOpenCaseId] = useState<string | null>(null);
  const [historyScope, setHistoryScope] = useState<PropertyHistoryScope>('completed');
  const [historyCategory, setHistoryCategory] = useState<LeasingHistoryCategory>('new_leasing');

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

  const handleRowClick = useCallback(
    (id: string) => {
      setSelectedCaseId(id);
      const item =
        workflowCases.find((workflowCase) => workflowCase.id === id) ??
        historyCases.find((workflowCase) => workflowCase.id === id) ??
        null;
      setDialogCase(item);
    },
    [historyCases, workflowCases],
  );

  const openLeasingCycle = useCallback(
    (cycle: LeasingCycle) => {
      handleRowClick(cycle.id);
    },
    [handleRowClick],
  );

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

  const leasingTableProps = {
    showViewToggle: true,
    selectedId: selectedCaseId,
    onRowClick: handleRowClick,
    canDeleteRow,
    onDeleteRow: (row: PropertyJobRow) => {
      const item = workflowCases.find((workflowCase) => workflowCase.id === row.id);
      if (item) setDeleteTarget(item);
    },
  };

  const renderLeasingTables = () => (
    <>
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">New leasing</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Active letting cycles and applications — click a row to open the full workflow.
          </p>
        </div>

        {activeLeasingCycles.length > 0 ? (
          <LeasingCyclesTable
            items={activeLeasingCycles}
            hidePropertyColumn
            selectedCycleId={selectedCaseId}
            onCycleClick={openLeasingCycle}
          />
        ) : supplementalNewLeasingJobRows.length === 0 && propertyTenantSelections.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No new leasing cases"
            description="Start a new letting cycle when the property is ready to lease."
          />
        ) : null}

        {supplementalNewLeasingJobRows.length > 0 ? (
          <PropertyJobCasesTable
            rows={supplementalNewLeasingJobRows}
            {...leasingTableProps}
            emptyTitle="No new leasing cases"
            emptyDescription="Start a new letting cycle when the property is ready to lease."
          />
        ) : null}

        {propertyTenantSelections.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Tenant applications
            </p>
            <TenantSelectionsTable items={propertyTenantSelections} />
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">End leasing</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Active end-leasing cases — click a case to open the vacating workflow.
          </p>
        </div>
        <PropertyJobCasesTable
          rows={endLeasingJobRows}
          {...leasingTableProps}
          emptyTitle="No end leasing cases"
          emptyDescription="End leasing cases appear here when a tenancy is being wound up."
        />
      </section>
    </>
  );

  const renderHistoryTables = () => {
    const completedNewLeasingRows = sortJobRowsByCreatedDesc(historyNewLeasingJobRows);
    const completedEndLeasingRows = sortJobRowsByCreatedDesc(historyEndLeasingJobRows);
    const hasCompletedHistory =
      completedNewLeasingRows.length > 0 || completedEndLeasingRows.length > 0;
    const hasDeletedHistory =
      deletedNewLeasingJobRows.length > 0 || deletedEndLeasingJobRows.length > 0;

    const displayedHistoryRows =
      historyScope === 'deleted'
        ? historyCategory === 'new_leasing'
          ? deletedNewLeasingJobRows
          : deletedEndLeasingJobRows
        : historyCategory === 'new_leasing'
          ? completedNewLeasingRows
          : completedEndLeasingRows;

    const hasAnyHistory = hasCompletedHistory || hasDeletedHistory;
    const categoryLabel =
      historyCategory === 'new_leasing' ? 'new leasing' : 'end leasing';

    return (
      <section className="space-y-4">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">History</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {historyScope === 'deleted'
                ? `Cancelled ${categoryLabel} cases, with the reason recorded at deletion.`
                : `Completed ${categoryLabel} cases — click a row to reopen the workflow.`}
            </p>
          </div>
          <FilterChips
            options={[...PROPERTY_HISTORY_SCOPE_FILTERS]}
            value={historyScope}
            onChange={(id) => setHistoryScope(id as PropertyHistoryScope)}
          />
          <FilterChips
            options={[...LEASING_HISTORY_CATEGORY_FILTERS]}
            value={historyCategory}
            onChange={(id) => setHistoryCategory(id as LeasingHistoryCategory)}
          />
        </div>

        {!hasAnyHistory ? (
          <EmptyState
            icon={RefreshCw}
            title="No leasing history"
            description="Completed and cancelled leasing cases will appear here."
          />
        ) : displayedHistoryRows.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title={
              historyScope === 'deleted'
                ? `No deleted ${categoryLabel} cases`
                : `No ${categoryLabel} history`
            }
            description={
              historyScope === 'deleted'
                ? `Cancelled ${categoryLabel} cases will appear here.`
                : `Completed ${categoryLabel} cases will appear here.`
            }
          />
        ) : (
          <PropertyJobCasesTable
            rows={displayedHistoryRows}
            showViewToggle
            selectedId={selectedCaseId}
            onRowClick={handleRowClick}
            emptyTitle={
              historyScope === 'deleted'
                ? `No deleted ${categoryLabel} cases`
                : `No ${categoryLabel} history`
            }
            emptyDescription={
              historyScope === 'deleted'
                ? `Cancelled ${categoryLabel} cases will appear here.`
                : `Completed ${categoryLabel} cases will appear here.`
            }
          />
        )}
      </section>
    );
  };

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
        {renderLeasingTables()}
        {renderHistoryTables()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workflowActions}

      {renderLeasingTables()}

      {renderHistoryTables()}

      <WorkflowCaseDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={
          deleteTarget?.category === 'end_leasing' ? 'Delete end-leasing case' : 'Delete letting case'
        }
        description="The case moves to History (Deleted filter) and the global Archive. A reason is required."
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
