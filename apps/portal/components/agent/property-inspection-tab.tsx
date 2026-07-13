'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { InspectionDetailDialog } from '@/components/agent/inspection-detail-dialog';
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
import { inspectionJobRows } from '@/lib/property-job-rows';
import { VACANT_TENANCY_INSPECTIONS_HINT } from '@/lib/property-leasing';
import type { PropertyJobRow } from '@/lib/property-job-rows';
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
  const jobRows = useMemo(() => inspectionJobRows(inspections), [inspections]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dialogInspection, setDialogInspection] = useState<Inspection | null>(null);
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
        setSelectedCaseId(result.inspection.id);
        setDialogInspection(result.inspection);
      }
    },
  };

  const handleRowClick = (id: string) => {
    setSelectedCaseId(id);
    setDialogInspection(inspections.find((inspection) => inspection.id === id) ?? null);
  };

  const handleDialogClose = () => {
    setDialogInspection(null);
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
    await cancelOpenInspectionJob(deleteTarget.id, reason);
    toast.success('Open inspection deleted');
    handleDialogClose();
    await refresh();
    await onRefresh?.();
  };

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />

      <PropertyJobCasesTable
        rows={jobRows}
        selectedId={selectedCaseId}
        onRowClick={handleRowClick}
        dateColumnLabel="Scheduled"
        canDeleteRow={canDeleteRow}
        onDeleteRow={(row) => {
          const inspection = inspections.find((item) => item.id === row.id) ?? null;
          if (inspection) setDeleteTarget(inspection);
        }}
        emptyTitle="No inspections"
        emptyDescription={emptyDescription}
      />

      <InspectionDetailDialog
        open={dialogInspection !== null}
        onClose={handleDialogClose}
        inspection={dialogInspection}
        navContext={fromProperty(propertyId, 'Inspection')}
        size={JOB_CASE_DIALOG_SIZE}
        canDelete={dialogInspection ? canDeleteInspection(dialogInspection) : false}
        onDelete={() => {
          if (dialogInspection) setDeleteTarget(dialogInspection);
        }}
      />

      <WorkflowCaseDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete open inspection"
        description="The open inspection is cancelled and removed from applicant browse. A reason is required."
        confirmLabel="Delete open inspection"
        onConfirm={handleDeleteConfirm}
        onSuccess={() => setDeleteTarget(null)}
      />
    </div>
  );
}
