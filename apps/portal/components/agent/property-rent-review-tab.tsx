'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyRentReviewCaseWorkflowDialog } from '@/components/agent/property-rent-review-case-workflow-dialog';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { cancelAgentRentReview } from '@/lib/crossub-api/agent-workflow-client';
import {
  isActiveRentReview,
  isDeletedRentReview,
  rentReviewFromArchived,
} from '@/lib/property-rent-review-history';
import {
  PROPERTY_HISTORY_SCOPE_FILTERS,
  type PropertyHistoryScope,
} from '@/lib/property-history-scope';
import type { RentReviewDecision } from '@/lib/rent-review';
import { buildPropertyWorkflowContext, tabActionsFor } from '@/lib/property-workflow-actions';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import {
  archivedRentReviewJobRows,
  rentReviewJobRows,
} from '@/lib/property-job-rows';
import type {
  ArchivedRentReview,
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
import { RENT_REVIEW_ADVANCE_ORDER_DAYS, RENT_REVIEW_CONDUCT_WINDOW_DAYS, RENT_REVIEW_STATUTORY_NOTICE_DAYS } from '@/lib/rent-review/scheduling';
import { isWorkflowCreatedCase, type PropertyWorkflowCreatedResult } from '@/lib/property-workflow-created';

export function PropertyRentReviewTab({
  property,
  propertyId,
  rentReviews,
  rentReviewDecisions,
  leasingRecords,
  leasingCycles,
  vacatingCases,
  maintenance,
  inspections,
  tribunalCases,
  tenantSelections,
  currentLease,
  onWorkflowCreated,
  deletedRentReviews = [],
}: {
  property: Property;
  propertyId: string;
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  leasingRecords: LeasingRecord[];
  leasingCycles: LeasingCycle[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  tenantSelections?: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  onWorkflowCreated?: () => void;
  deletedRentReviews?: ArchivedRentReview[];
}) {
  const { apiConnected, refresh } = useAgentData();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [dialogReview, setDialogReview] = useState<RentReviewCase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RentReviewCase | null>(null);
  const [pendingOpenReviewId, setPendingOpenReviewId] = useState<string | null>(null);
  const [historyScope, setHistoryScope] = useState<PropertyHistoryScope>('completed');

  const handleWorkflowCreated = useCallback(
    async (result?: PropertyWorkflowCreatedResult) => {
      await refresh();
      onWorkflowCreated?.();
      if (result && isWorkflowCreatedCase(result) && result.kind === 'rent_review') {
        setPendingOpenReviewId(result.id);
      }
    },
    [onWorkflowCreated, refresh],
  );

  const workflowPanelProps = {
    tab: 'rent_review' as const,
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

  const workflowCtx = useMemo(
    () =>
      buildPropertyWorkflowContext({
        propertyId,
        leasingCycles,
        rentReviews,
        vacatingCases,
        maintenance,
        inspections,
        tribunalCases,
        currentLease,
      }),
    [
      propertyId,
      leasingCycles,
      rentReviews,
      vacatingCases,
      maintenance,
      inspections,
      tribunalCases,
      currentLease,
    ],
  );

  const rentReviewAction = tabActionsFor('rent_review', workflowCtx).find(
    (action) => action.id === 'start_rent_review',
  );
  const canAddRentReview = Boolean(rentReviewAction && !rentReviewAction.disabled);
  const hasActiveReview = rentReviews.some((review) =>
    isActiveRentReview(review, rentReviewDecisions[review.id]),
  );

  const activeReviews = useMemo(
    () =>
      rentReviews.filter((review) =>
        isActiveRentReview(review, rentReviewDecisions[review.id]),
      ),
    [rentReviewDecisions, rentReviews],
  );

  const historyReviews = useMemo(
    () =>
      rentReviews.filter(
        (review) =>
          !isDeletedRentReview(review) &&
          !isActiveRentReview(review, rentReviewDecisions[review.id]),
      ),
    [rentReviewDecisions, rentReviews],
  );

  const activeJobRows = useMemo(
    () => rentReviewJobRows(activeReviews, rentReviewDecisions),
    [activeReviews, rentReviewDecisions],
  );

  const historyJobRows = useMemo(
    () => rentReviewJobRows(historyReviews, rentReviewDecisions),
    [historyReviews, rentReviewDecisions],
  );

  const deletedJobRows = useMemo(
    () => archivedRentReviewJobRows(deletedRentReviews, rentReviews, rentReviewDecisions),
    [deletedRentReviews, rentReviewDecisions, rentReviews],
  );

  const displayedHistoryJobRows =
    historyScope === 'deleted' ? deletedJobRows : historyJobRows;

  const openReviewDialog = useCallback((review: RentReviewCase) => {
    setSelectedCaseId(review.id);
    setDialogReview(review);
  }, []);

  useEffect(() => {
    if (!pendingOpenReviewId) return;
    const review = rentReviews.find((item) => item.id === pendingOpenReviewId);
    if (!review) return;
    openReviewDialog(review);
    setPendingOpenReviewId(null);
  }, [openReviewDialog, pendingOpenReviewId, rentReviews]);

  const openReviewById = useCallback(
    (id: string) => {
      const review = rentReviews.find((item) => item.id === id);
      if (review) {
        openReviewDialog(review);
        return;
      }
      const archived = deletedRentReviews.find((item) => item.id === id);
      if (archived) {
        openReviewDialog(rentReviewFromArchived(archived, rentReviews));
      }
    },
    [deletedRentReviews, openReviewDialog, rentReviews],
  );

  const handleDialogClose = () => {
    setDialogReview(null);
    setSelectedCaseId(null);
  };

  const canDeleteReview = useCallback(
    (review: RentReviewCase) => {
      if (!apiConnected) return false;
      return isActiveRentReview(review, rentReviewDecisions[review.id]);
    },
    [apiConnected, rentReviewDecisions],
  );

  const canDeleteRow = useCallback(
    (row: PropertyJobRow) => {
      const review = rentReviews.find((item) => item.id === row.id);
      return review ? canDeleteReview(review) : false;
    },
    [canDeleteReview, rentReviews],
  );

  const handleDeleteConfirm = async (reason: string) => {
    if (!deleteTarget) return;
    if (!apiConnected) {
      throw new Error('Connect to the API to delete cases');
    }
    await cancelAgentRentReview(propertyId, deleteTarget.id, { reason });
    toast.success('Rent review deleted');
    handleDialogClose();
    await refresh();
    onWorkflowCreated?.();
  };

  const rentReviewTableProps = {
    showViewToggle: false,
    dateColumnLabel: 'Due date' as const,
    selectedId: selectedCaseId,
    onRowClick: openReviewById,
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <PropertyWorkflowPanel {...workflowPanelProps} actionsOnly />
        {!canAddRentReview && hasActiveReview ? (
          <p className="text-muted-foreground text-xs">
            A rent review is already in progress for this property. Complete it before starting
            another.
          </p>
        ) : null}
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Rent review cases</h3>
        <p className="text-muted-foreground text-xs">
          Active rent reviews in progress. Click a case to open the full workflow. Countdown tracks
          the agent&apos;s {RENT_REVIEW_CONDUCT_WINDOW_DAYS}-day conduct window (review opens{' '}
          {RENT_REVIEW_ADVANCE_ORDER_DAYS} days before lease end;{' '}
          {RENT_REVIEW_STATUTORY_NOTICE_DAYS} days remain for the statutory tenant notice).
        </p>
        {/*
          This element used to spread `rentReviewTableProps` a SECOND time below its own
          `showRentReviewSchedule`, so the spread's `false` won on the last write and the
          schedule column never appeared on the active table. The duplicate spread is gone,
          and the flag now lives on the table that wants it rather than in the shared object.
        */}
        <PropertyJobCasesTable
          rows={activeJobRows}
          {...rentReviewTableProps}
          showRentReviewSchedule
          canDeleteRow={canDeleteRow}
          onDeleteRow={(row) => {
            const review = rentReviews.find((item) => item.id === row.id) ?? null;
            if (review) setDeleteTarget(review);
          }}
          emptyTitle="No rent review cases"
          emptyDescription="Start a rent review when the lease is due for renewal."
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">History</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {historyScope === 'deleted'
                ? 'Cancelled rent reviews — click a row to view the archived workflow.'
                : 'Completed rent reviews — click a row to reopen the workflow.'}
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
            icon={RefreshCw}
            title={
              historyScope === 'deleted' ? 'No deleted rent reviews' : 'No rent review history'
            }
            description={
              historyScope === 'deleted'
                ? 'Cancelled rent reviews will appear here.'
                : 'Past rent reviews will appear here once completed.'
            }
          />
        ) : (
          <PropertyJobCasesTable
            rows={displayedHistoryJobRows}
            emptyTitle={
              historyScope === 'deleted' ? 'No deleted rent reviews' : 'No rent review history'
            }
            emptyDescription={
              historyScope === 'deleted'
                ? 'Cancelled rent reviews will appear here.'
                : 'Past rent reviews will appear here once completed.'
            }
            {...rentReviewTableProps}
            showRentReviewSchedule={false}
          />
        )}
      </section>

      <PropertyRentReviewCaseWorkflowDialog
        open={dialogReview !== null}
        onClose={handleDialogClose}
        review={dialogReview}
        canDelete={dialogReview ? canDeleteReview(dialogReview) : false}
        onDelete={() => {
          if (dialogReview) setDeleteTarget(dialogReview);
        }}
      />

      <WorkflowCaseDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete rent review"
        description="The rent review moves to History (Deleted filter) and the global Archive. A reason is required."
        confirmLabel="Delete rent review"
        onConfirm={handleDeleteConfirm}
        onSuccess={() => setDeleteTarget(null)}
      />
    </div>
  );
}
