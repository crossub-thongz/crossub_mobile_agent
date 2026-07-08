'use client';

import { useMemo, useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { PropertyInspectionWorkflowShell } from '@/components/agent/property-inspection-workflow-shell';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { buildPropertyInspectionWorkflowCases } from '@/lib/property-inspection-workflow-cases';
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
  const [view, setView] = useState<'current' | 'completed'>('current');

  const viewInspections = useMemo(() => {
    const completed = (inspection: Inspection) =>
      inspection.status.toLowerCase().includes('complete');
    return inspections.filter((inspection) =>
      view === 'current' ? !completed(inspection) : completed(inspection),
    );
  }, [inspections, view]);

  const workflowCases = useMemo(
    () => buildPropertyInspectionWorkflowCases(viewInspections),
    [viewInspections],
  );

  const emptyDescription =
    isVacant
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
      <FilterChips
        options={[
          { id: 'current', label: 'Current' },
          { id: 'completed', label: 'Completed' },
        ]}
        value={view}
        onChange={(value) => setView(value as 'current' | 'completed')}
      />

      {workflowCases.length === 0 ? (
        <PropertyWorkflowPanel
          {...workflowPanelProps}
          emptyTitle={`No ${view} inspections`}
          emptyDescription={emptyDescription}
        />
      ) : (
        <>
          <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />
          <PropertyInspectionWorkflowShell
            cases={workflowCases}
            onViewDetails={onViewInspection}
          />
        </>
      )}
    </div>
  );
}
