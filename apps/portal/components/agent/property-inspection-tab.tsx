'use client';

import { useMemo, useState } from 'react';

import { InspectionDetailDialog } from '@/components/agent/inspection-detail-dialog';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { fromProperty } from '@/lib/detail-navigation';
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
  const jobRows = useMemo(() => inspectionJobRows(inspections), [inspections]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dialogInspection, setDialogInspection] = useState<Inspection | null>(null);

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

  const handleRowClick = (id: string) => {
    setSelectedCaseId(id);
    setDialogInspection(inspections.find((inspection) => inspection.id === id) ?? null);
  };

  const handleDialogClose = () => {
    setDialogInspection(null);
    setSelectedCaseId(null);
  };

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />

      <PropertyJobCasesTable
        rows={jobRows}
        selectedId={selectedCaseId}
        onRowClick={handleRowClick}
        emptyTitle="No inspections"
        emptyDescription={emptyDescription}
      />

      <InspectionDetailDialog
        open={dialogInspection !== null}
        onClose={handleDialogClose}
        inspection={dialogInspection}
        navContext={fromProperty(propertyId, 'Inspection')}
        size="xl"
      />
    </div>
  );
}
