'use client';

import { useCallback, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
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
import { inspectionJobRows } from '@/lib/property-job-rows';
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
  const { apiConnected, refresh } = useAgentData();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Inspection | null>(null);

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
        <div>
          <h3 className="text-sm font-semibold">History</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Completed inspections — click a row to reopen the workflow.
          </p>
        </div>

        {historyJobRows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No inspection history"
            description="Past inspections will appear here once completed."
          />
        ) : (
          <PropertyJobCasesTable
            rows={historyJobRows}
            emptyTitle="No inspection history"
            emptyDescription="Past inspections will appear here once completed."
            {...inspectionTableProps}
          />
        )}
      </section>

      {deletedJobRows.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Deleted</h3>
          <p className="text-muted-foreground text-xs">
            Cancelled open inspections for this property. Click a row to view the archived case.
          </p>
          <PropertyJobCasesTable
            rows={deletedJobRows}
            emptyTitle="No deleted inspections"
            emptyDescription="Cancelled open inspections will appear here."
            {...inspectionTableProps}
          />
        </section>
      ) : null}

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
        description="The open inspection is cancelled and moves to the Deleted section below. A reason is required."
        confirmLabel="Delete open inspection"
        onConfirm={handleDeleteConfirm}
        onSuccess={() => setDeleteTarget(null)}
      />
    </div>
  );
}
