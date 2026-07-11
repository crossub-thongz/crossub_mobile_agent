'use client';

import { useMemo, useState } from 'react';

import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyMaintenanceCaseDialog } from '@/components/agent/property-maintenance-case-dialog';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { maintenanceJobRows } from '@/lib/property-job-rows';
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
  const jobRows = useMemo(() => maintenanceJobRows(maintenance), [maintenance]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dialogRequest, setDialogRequest] = useState<MaintenanceRequest | null>(null);

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
    onCreated: onRefresh,
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
