'use client';

import { useMemo, useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { PropertyMaintenanceWorkflowShell } from '@/components/agent/property-maintenance-workflow-shell';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { buildPropertyMaintenanceWorkflowCases } from '@/lib/property-maintenance-workflow-cases';
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

function isCompletedMaintenance(request: MaintenanceRequest): boolean {
  const status = request.status.toLowerCase();
  return status.includes('complete') || status.includes('closed');
}

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
  const [view, setView] = useState<'current' | 'history'>('current');

  const viewMaintenance = useMemo(
    () =>
      maintenance.filter((request) =>
        view === 'current' ? !isCompletedMaintenance(request) : isCompletedMaintenance(request),
      ),
    [maintenance, view],
  );

  const workflowCases = useMemo(
    () => buildPropertyMaintenanceWorkflowCases(viewMaintenance),
    [viewMaintenance],
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
    onCreated: onRefresh,
  };

  return (
    <div className="space-y-4">
      <FilterChips
        options={[
          { id: 'current', label: 'Current' },
          { id: 'history', label: 'History' },
        ]}
        value={view}
        onChange={(value) => setView(value as 'current' | 'history')}
      />

      {workflowCases.length === 0 ? (
        <PropertyWorkflowPanel
          {...workflowPanelProps}
          emptyTitle={view === 'current' ? 'No active maintenance' : 'No completed maintenance cases'}
          emptyDescription={
            view === 'current'
              ? 'Log a maintenance job for this property to begin the workflow.'
              : 'Completed maintenance cases will appear here.'
          }
        />
      ) : (
        <>
          <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly={view === 'current'} />
          <PropertyMaintenanceWorkflowShell
            cases={workflowCases}
            property={property}
            propertyId={propertyId}
          />
        </>
      )}
    </div>
  );
}
