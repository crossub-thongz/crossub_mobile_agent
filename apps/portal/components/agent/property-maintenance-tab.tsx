'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyMaintenanceCaseDialog } from '@/components/agent/property-maintenance-case-dialog';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { maintenanceJobRows } from '@/lib/property-job-rows';
import { isWorkflowCreatedCase, type PropertyWorkflowCreatedResult } from '@/lib/property-workflow-created';
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

export function PropertyMaintenanceTab({
  property,
  propertyId,
  maintenance,
  leasingCycles,
  rentReviews,
  vacatingCases,
  inspections,
  tribunalCases,
  tenantSelections,
  currentLease,
  onRefresh,
}: {
  property: Property;
  propertyId: string;
  maintenance: MaintenanceRequest[];
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  tenantSelections: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  onRefresh?: () => void;
}) {
  const { refresh } = useAgentData();
  const jobRows = useMemo(() => maintenanceJobRows(maintenance), [maintenance]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dialogRequest, setDialogRequest] = useState<MaintenanceRequest | null>(null);
  const [pendingOpenRequestId, setPendingOpenRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingOpenRequestId) return;
    const request = maintenance.find((item) => item.id === pendingOpenRequestId);
    if (!request) return;
    setSelectedCaseId(request.id);
    setDialogRequest(request);
    setPendingOpenRequestId(null);
  }, [maintenance, pendingOpenRequestId]);

  const handleWorkflowCreated = useCallback(
    async (result?: PropertyWorkflowCreatedResult) => {
      await refresh();
      onRefresh?.();
      if (result && isWorkflowCreatedCase(result) && result.kind === 'maintenance') {
        setPendingOpenRequestId(result.id);
      }
    },
    [onRefresh, refresh],
  );

  const workflowPanelProps = {
    tab: 'maintenance' as const,
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
    onCreated: handleWorkflowCreated,
  };

  const handleRowClick = (id: string) => {
    setSelectedCaseId(id);
    setDialogRequest(maintenance.find((request) => request.id === id) ?? null);
  };

  const handleDialogClose = () => {
    setDialogRequest(null);
    setSelectedCaseId(null);
  };

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />

      <PropertyJobCasesTable
        rows={jobRows}
        selectedId={selectedCaseId}
        onRowClick={handleRowClick}
        showKeyDateColumn={false}
        emptyTitle="No maintenance jobs"
        emptyDescription="Log a maintenance job for this property to begin the workflow."
      />

      <PropertyMaintenanceCaseDialog
        open={dialogRequest !== null}
        onClose={handleDialogClose}
        request={dialogRequest}
        property={property}
        propertyId={propertyId}
      />
    </div>
  );
}
