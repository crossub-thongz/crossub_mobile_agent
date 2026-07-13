'use client';

import { useMemo, useState } from 'react';

import { InspectionCaseDetailDialog } from '@/components/inspections/inspection-case-detail-dialog';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { InspectionCreateResult } from '@/components/inspections/create-inspection-wizard';
import { fromProperty } from '@/lib/detail-navigation';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
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
  onViewInspection?: (inspectionId: string) => void;
  onRefresh?: () => void;
}) {
  const { refresh } = useAgentData();
  const jobRows = useMemo(() => inspectionJobRows(inspections), [inspections]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

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

  const handleRowClick = (id: string) => {
    setSelectedCaseId(id);
    if (onViewInspection) {
      onViewInspection(id);
      return;
    }
  };

  const handleDialogClose = () => {
    setSelectedCaseId(null);
  };

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />

      <PropertyJobCasesTable
        rows={jobRows}
        selectedId={selectedCaseId}
        onRowClick={handleRowClick}
        dateColumnLabel="Scheduled"
        emptyTitle="No inspections"
        emptyDescription={emptyDescription}
      />

      {!onViewInspection ? (
        <InspectionCaseDetailDialog
          open={selectedCaseId !== null}
          onClose={handleDialogClose}
          inspectionId={selectedCaseId}
          navContext={fromProperty(propertyId, 'Inspection')}
          size={JOB_CASE_DIALOG_SIZE}
        />
      ) : null}
    </div>
  );
}
