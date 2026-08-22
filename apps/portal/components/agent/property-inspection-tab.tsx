'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { InspectionCaseDetailDialog } from '@/components/inspections/inspection-case-detail-dialog';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { InspectionCreateResult } from '@/components/inspections/create-inspection-wizard';
import { fromProperty } from '@/lib/detail-navigation';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import {
  canDeleteOpenInspection,
  cancelOpenInspectionJob,
} from '@/lib/open-inspection-delete';
import {
  isActiveInspection,
  isDeletedInspection,
  isHistoryInspection,
} from '@/lib/property-inspection-history';
import {
  PROPERTY_HISTORY_SCOPE_FILTERS,
  type PropertyHistoryScope,
} from '@/lib/property-history-scope';
import { inspectionJobRows } from '@/lib/property-job-rows';
import { inspectionsApi } from '@/lib/inspections-api';
import { mapInspectionRecordToView } from '@/lib/inspection-mappers';
import { isActiveRoutineInspectionStatus } from '@/lib/routine/routine-instance-state';
import { routineInspectionApi } from '@/lib/routine-inspection-api';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import { VACANT_TENANCY_INSPECTIONS_HINT } from '@/lib/property-leasing';
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

function sortInspectionRows(rows: PropertyJobRow[]): PropertyJobRow[] {
  return [...rows].sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function PropertyInspectionTab({
  property,
  propertyId,
  inspections,
  leasingCycles,
  rentReviews,
  vacatingCases,
  maintenance,
  tribunalCases,
  tenantSelections,
  currentLease,
  isVacant,
  onViewInspection,
  onRefresh,
}: {
  property: Property;
  propertyId: string;
  inspections: Inspection[];
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceRequest[];
  tribunalCases: TribunalCase[];
  tenantSelections: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  isVacant: boolean;
  onViewInspection?: (inspectionId: string) => void;
  onRefresh?: () => void;
}) {
  const { apiConnected, refresh, registerInspection } = useAgentData();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Inspection | null>(null);
  const [historyScope, setHistoryScope] = useState<PropertyHistoryScope>('completed');

  useEffect(() => {
    if (!apiConnected || !propertyId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [{ inspections: rows }, scheduleResult] = await Promise.all([
          inspectionsApi.list({ propertyId, pageSize: 200 }),
          routineInspectionApi.getByProperty(propertyId).catch(() => null),
        ]);
        if (cancelled) return;
        for (const record of rows) {
          registerInspection(mapInspectionRecordToView(record));
        }
        const inspectionId = scheduleResult?.schedule?.currentInspectionId;
        const knownIds = new Set(rows.map((row) => row.id).filter(Boolean));
        if (
          inspectionId &&
          !knownIds.has(inspectionId) &&
          isActiveRoutineInspectionStatus(
            scheduleResult?.schedule?.currentInspectionStatus,
          )
        ) {
          const record = await inspectionsApi.get(inspectionId);
          if (!cancelled) registerInspection(mapInspectionRecordToView(record));
        }
      } catch {
        /* schedule-only properties have nothing extra to show */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Heal once per property visit — live GET in the case dialog keeps status current.
  }, [apiConnected, propertyId, registerInspection]);

  const emptyDescription = isVacant
    ? VACANT_TENANCY_INSPECTIONS_HINT
    : 'When an inspection is scheduled, it will appear here.';

  const workflowPanelProps = {
    tab: 'inspection' as const,
    property,
    propertyId,
    leasingCycles,
    rentReviews,
    vacatingCases,
    maintenance,
    inspections,
    tribunalCases,
    tenantSelections,
    currentLease,
    onCreated: (result?: InspectionCreateResult) => {
      void onRefresh?.();
      void refresh();
      if (result?.inspection) {
        const id = result.inspection.id;
        setSelectedCaseId(id);
        onViewInspection?.(id);
      }
    },
  };

  const activeInspections = useMemo(
    () => inspections.filter(isActiveInspection),
    [inspections],
  );

  const historyInspections = useMemo(
    () => inspections.filter(isHistoryInspection),
    [inspections],
  );

  const deletedInspections = useMemo(
    () => inspections.filter(isDeletedInspection),
    [inspections],
  );

  const activeJobRows = useMemo(
    () => sortInspectionRows(inspectionJobRows(activeInspections)),
    [activeInspections],
  );

  const historyJobRows = useMemo(
    () => sortInspectionRows(inspectionJobRows(historyInspections)),
    [historyInspections],
  );

  const deletedJobRows = useMemo(
    () => sortInspectionRows(inspectionJobRows(deletedInspections)),
    [deletedInspections],
  );

  const displayedHistoryJobRows =
    historyScope === 'deleted' ? deletedJobRows : historyJobRows;

  const openInspectionById = useCallback(
    (id: string) => {
      setSelectedCaseId(id);
      onViewInspection?.(id);
    },
    [onViewInspection],
  );

  const handleDialogClose = () => {
    setSelectedCaseId(null);
  };

  const canDeleteInspection = useCallback(
    (inspection: Inspection) => apiConnected && canDeleteOpenInspection(inspection),
    [apiConnected],
  );

  const canDeleteRow = useCallback(
    (row: PropertyJobRow) => {
      const inspection = inspections.find((item) => item.id === row.id);
      return inspection ? canDeleteInspection(inspection) : false;
    },
    [canDeleteInspection, inspections],
  );

  const handleDeleteConfirm = async (reason: string) => {
    if (!deleteTarget) return;
    if (!apiConnected) {
      throw new Error('Connect to the API to delete cases');
    }
    await cancelOpenInspectionJob(deleteTarget, reason);
    toast.success('Open inspection deleted');
    handleDialogClose();
    await refresh();
    await onRefresh?.();
  };

  const inspectionTableProps = {
    showViewToggle: false,
    dateColumnLabel: 'Scheduled' as const,
    selectedId: selectedCaseId,
    onRowClick: openInspectionById,
  };

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Inspection cases</h3>
        <p className="text-muted-foreground text-xs">
          Active inspections in progress. Click a case to open the full workflow.
        </p>
        <PropertyJobCasesTable
          rows={activeJobRows}
          {...inspectionTableProps}
          canDeleteRow={canDeleteRow}
          onDeleteRow={(row) => {
            const inspection = inspections.find((item) => item.id === row.id) ?? null;
            if (inspection) setDeleteTarget(inspection);
          }}
          emptyTitle="No inspection cases"
          emptyDescription={emptyDescription}
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">History</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {historyScope === 'deleted'
                ? 'Cancelled open inspections — click a row to view the archived case.'
                : 'Completed inspections — click a row to reopen the workflow.'}
            </p>
          </div>
          <FilterChips
            options={[...PROPERTY_HISTORY_SCOPE_FILTERS]}
            value={historyScope}
            onChange={(id) => setHistoryScope(id as PropertyHistoryScope)}
          />
        </div>

        {displayedHistoryJobRows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={
              historyScope === 'deleted' ? 'No deleted inspections' : 'No inspection history'
            }
            description={
              historyScope === 'deleted'
                ? 'Cancelled open inspections will appear here.'
                : 'Past inspections will appear here once completed.'
            }
          />
        ) : (
          <PropertyJobCasesTable
            rows={displayedHistoryJobRows}
            emptyTitle={
              historyScope === 'deleted' ? 'No deleted inspections' : 'No inspection history'
            }
            emptyDescription={
              historyScope === 'deleted'
                ? 'Cancelled open inspections will appear here.'
                : 'Past inspections will appear here once completed.'
            }
            {...inspectionTableProps}
          />
        )}
      </section>

      {!onViewInspection ? (
        <InspectionCaseDetailDialog
          open={selectedCaseId !== null}
          onClose={handleDialogClose}
          inspectionId={selectedCaseId}
          navContext={fromProperty(propertyId, 'Inspection')}
          size={JOB_CASE_DIALOG_SIZE}
        />
      ) : null}

      <WorkflowCaseDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete open inspection"
        description="The open inspection is cancelled and moves to History (Deleted filter). A reason is required."
        confirmLabel="Delete open inspection"
        onConfirm={handleDeleteConfirm}
        onSuccess={() => setDeleteTarget(null)}
      />
    </div>
  );
}
