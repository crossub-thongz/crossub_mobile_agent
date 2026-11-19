'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { maintenanceDetail } from '@/constants/routes';
import { cancelAgentMaintenance } from '@/lib/crossub-api/agent-workflow-client';
import { fromProperty } from '@/lib/detail-navigation';
import {
  PROPERTY_HISTORY_SCOPE_FILTERS,
  type PropertyHistoryScope,
} from '@/lib/property-history-scope';
import {
  canDeleteMaintenance,
  isActiveMaintenance,
  isDeletedMaintenance,
  isHistoryMaintenance,
} from '@/lib/property-maintenance-history';
import { maintenanceJobRows, type PropertyJobRow } from '@/lib/property-job-rows';
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
  const router = useRouter();
  const { apiConnected, refresh } = useAgentData();
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(null);
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

  const openMaintenance = useCallback(
    (id: string) => {
      router.push(maintenanceDetail(id, fromProperty(propertyId, 'Maintenance')));
    },
    [propertyId, router],
  );

  const handleWorkflowCreated = useCallback(
    async (result?: PropertyWorkflowCreatedResult) => {
      await refresh();
      onRefresh?.();
      if (result && isWorkflowCreatedCase(result) && result.kind === 'maintenance') {
        openMaintenance(result.id);
      }
    },
    [onRefresh, openMaintenance, refresh],
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
    openMaintenance(id);
  };

  const canDeleteRequest = useCallback(
    (request: MaintenanceRequest) => apiConnected && canDeleteMaintenance(request),
    [apiConnected],
  );

  const canDeleteRow = useCallback(
    (row: PropertyJobRow) => {
      const request = maintenance.find((item) => item.id === row.id);
      return request ? canDeleteRequest(request) : false;
    },
    [canDeleteRequest, maintenance],
  );

  const handleDeleteConfirm = async (reason: string) => {
    if (!deleteTarget) return;
    if (!apiConnected) {
      throw new Error('Connect to the API to delete cases');
    }
    await cancelAgentMaintenance(propertyId, deleteTarget.id, { reason });
    toast.success('Maintenance job deleted');
    await refresh();
    onRefresh?.();
  };

  const maintenanceTableProps = {
    onRowClick: handleRowClick,
    showKeyDateColumn: false,
  };

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Repair cases</h3>
        <p className="text-muted-foreground text-xs">
          Active repair jobs in progress. Click a case to open the task.
        </p>
        <PropertyJobCasesTable
          rows={activeJobRows}
          {...maintenanceTableProps}
          canDeleteRow={canDeleteRow}
          onDeleteRow={(row) => {
            const request = maintenance.find((item) => item.id === row.id) ?? null;
            if (request) setDeleteTarget(request);
          }}
          emptyTitle="No repair jobs"
          emptyDescription="Add a repair job for this property to begin the workflow."
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">History</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {historyScope === 'deleted'
                ? 'Deleted maintenance jobs — click a row to open the task.'
                : 'Completed maintenance jobs — click a row to open the task.'}
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
                ? 'Deleted maintenance jobs will appear here with their reason.'
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
                ? 'Deleted maintenance jobs will appear here with their reason.'
                : 'Past maintenance jobs will appear here once completed.'
            }
          />
        )}
      </section>

      <WorkflowCaseDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete maintenance job"
        description="The job moves to History (Deleted filter) with your reason recorded. This cannot be undone."
        confirmLabel="Delete maintenance job"
        onConfirm={handleDeleteConfirm}
        onSuccess={() => setDeleteTarget(null)}
      />
    </div>
  );
}
