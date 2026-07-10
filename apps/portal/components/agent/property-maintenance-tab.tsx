'use client';

import { useEffect, useMemo, useState } from 'react';

import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyMaintenanceJobPanel } from '@/components/agent/property-maintenance-job-panel';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { maintenanceJobRows } from '@/lib/property-job-rows';
import { pickPrimaryMaintenanceCase } from '@/lib/property-maintenance-workflow-cases';
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

  const selectedRequest = useMemo(
    () => maintenance.find((request) => request.id === selectedCaseId) ?? null,
    [maintenance, selectedCaseId],
  );

  useEffect(() => {
    if (maintenance.length === 0) {
      setSelectedCaseId(null);
      return;
    }
    if (!selectedCaseId || !maintenance.some((request) => request.id === selectedCaseId)) {
      const primary = pickPrimaryMaintenanceCase(
        maintenance.map((request) => ({
          id: request.id,
          label: request.trackingNumber,
          title: request.title,
          status: request.status,
          currentStep: request.status,
          request,
        })),
      );
      setSelectedCaseId(primary?.id ?? maintenance[0]?.id ?? null);
    }
  }, [maintenance, selectedCaseId]);

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

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />

      {jobRows.length === 0 ? (
        <PropertyJobCasesTable
          rows={[]}
          emptyTitle="No maintenance jobs"
          emptyDescription="Log a maintenance job for this property to begin the workflow."
        />
      ) : (
        <>
          <PropertyJobCasesTable
            rows={jobRows}
            selectedId={selectedCaseId}
            onRowClick={setSelectedCaseId}
          />
          {selectedRequest ? (
            <PropertyMaintenanceJobPanel
              item={selectedRequest}
              property={property}
              propertyId={propertyId}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
