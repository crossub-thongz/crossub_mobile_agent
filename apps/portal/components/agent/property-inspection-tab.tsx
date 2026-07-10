'use client';

import { useEffect, useMemo, useState } from 'react';

import { PropertyInspectionWorkflowShell } from '@/components/agent/property-inspection-workflow-shell';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { inspectionJobRows } from '@/lib/property-job-rows';
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
  onViewInspection: (inspectionId: string) => void;
  onRefresh?: () => void;
}) {
  const jobRows = useMemo(() => inspectionJobRows(inspections), [inspections]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const selectedInspection = useMemo(
    () => inspections.find((inspection) => inspection.id === selectedCaseId) ?? null,
    [inspections, selectedCaseId],
  );

  useEffect(() => {
    if (inspections.length === 0) {
      setSelectedCaseId(null);
      return;
    }
    if (!selectedCaseId || !inspections.some((inspection) => inspection.id === selectedCaseId)) {
      setSelectedCaseId(inspections[0]?.id ?? null);
    }
  }, [inspections, selectedCaseId]);

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
    onCreated: onRefresh,
  };

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />

      {jobRows.length === 0 ? (
        <PropertyJobCasesTable
          rows={[]}
          emptyTitle="No inspections"
          emptyDescription={emptyDescription}
        />
      ) : (
        <>
          <PropertyJobCasesTable
            rows={jobRows}
            selectedId={selectedCaseId}
            onRowClick={setSelectedCaseId}
          />
          {selectedInspection ? (
            <PropertyInspectionWorkflowShell
              cases={[
                {
                  id: selectedInspection.id,
                  category:
                    selectedInspection.type === 'OPEN'
                      ? 'open'
                      : selectedInspection.type === 'INGOING'
                        ? 'ingoing'
                        : selectedInspection.type === 'OUTGOING'
                          ? 'outgoing'
                          : 'routine',
                  label: selectedInspection.trackingNumber,
                  status: selectedInspection.status,
                  currentStep: selectedInspection.status,
                  inspection: selectedInspection,
                },
              ]}
              onViewDetails={onViewInspection}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
