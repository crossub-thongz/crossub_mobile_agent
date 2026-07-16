'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wrench } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyMaintenanceCaseDialog } from '@/components/agent/property-maintenance-case-dialog';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  PROPERTY_HISTORY_SCOPE_FILTERS,
  type PropertyHistoryScope,
} from '@/lib/property-history-scope';
import {
  isActiveMaintenance,
  isDeletedMaintenance,
  isHistoryMaintenance,
} from '@/lib/property-maintenance-history';
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
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dialogRequest, setDialogRequest] = useState<MaintenanceRequest | null>(null);
  const [pendingOpenRequestId, setPendingOpenRequestId] = useState<string | null>(null);
  const [historyScope, setHistoryScope] = useState<PropertyHistoryScope>('completed');

  const activeMaintenance = useMemo(
    () => maintenance.filter(isActiveMaintenance),
    [maintenance],
  );
  const historyMaintenance = useMemo(
    () => maintenance.filter(isHistoryMaintenance),
    [maintenance],
  );
  const deletedMaintenance = useMemo(
    () => maintenance.filter(isDeletedMaintenance),
    [maintenance],
  );

  const activeJobRows = useMemo(() => maintenanceJobRows(activeMaintenance), [activeMaintenance]);
  const historyJobRows = useMemo(() => maintenanceJobRows(historyMaintenance), [historyMaintenance]);
  const deletedJobRows = useMemo(() => maintenanceJobRows(deletedMaintenance), [deletedMaintenance]);
  const displayedHistoryJobRows =
    historyScope === 'deleted' ? deletedJobRows : historyJobRows;

  useEffect(() => {
    if (!dialogRequest) return;
    const updated = maintenance.find((item) => item.id === dialogRequest.id);
    if (updated) setDialogRequest(updated);
  }, [maintenance, dialogRequest?.id]);

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

  const maintenanceTableProps = {
    selectedId: selectedCaseId,
    onRowClick: handleRowClick,
    showKeyDateColumn: false,
  };

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Maintenance cases</h3>
        <p className="text-muted-foreground text-xs">
          Active maintenance jobs in progress. Click a case to open the workflow popup.
        </p>
        <PropertyJobCasesTable
          rows={activeJobRows}
          {...maintenanceTableProps}
          emptyTitle="No maintenance jobs"
          emptyDescription="Log a maintenance job for this property to begin the workflow."
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">History</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {historyScope === 'deleted'
                ? 'Cancelled maintenance jobs — click a row to view the case.'
                : 'Completed maintenance jobs — click a row to reopen the workflow.'}
            </p>
          </div>
          <FilterChips
            options={[...PROPERTY_HISTORY_SCOPE_FILTERS]}
            value={historyScope}
            onChange={(id) => setHistoryScope(id as PropertyHistoryScope)}
          />
        </div>

        {displayedHistoryJobRows.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={
              historyScope === 'deleted'
                ? 'No deleted maintenance jobs'
                : 'No maintenance history'
            }
            description={
              historyScope === 'deleted'
                ? 'Cancelled maintenance jobs will appear here.'
                : 'Past maintenance jobs will appear here once completed.'
            }
          />
        ) : (
          <PropertyJobCasesTable
            rows={displayedHistoryJobRows}
            {...maintenanceTableProps}
            emptyTitle={
              historyScope === 'deleted'
                ? 'No deleted maintenance jobs'
                : 'No maintenance history'
            }
            emptyDescription={
              historyScope === 'deleted'
                ? 'Cancelled maintenance jobs will appear here.'
                : 'Past maintenance jobs will appear here once completed.'
            }
          />
        )}
      </section>

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
