'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { ArchivedRentReviewsTable } from '@/components/agent/archive-module-tables';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyRentReviewCaseWorkflowDialog } from '@/components/agent/property-rent-review-case-workflow-dialog';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { SortableTableHeader } from '@/components/agent/sortable-table-header';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { rentReviewDetail } from '@/constants/routes';
import { cancelAgentRentReview } from '@/lib/crossub-api/agent-workflow-client';
import {
  applySortDirection,
  compareSortTime,
  compareStrings,
  useClientTableSort,
} from '@/lib/client-table-sort';
import { fromProperty } from '@/lib/detail-navigation';
import { buildRentReviewHistoryRows, isActiveRentReview, type RentReviewSummaryRow } from '@/lib/property-rent-review-history';
import { rentReviewCreatedAtIso } from '@/lib/record-created-at';
import type { RentReviewDecision } from '@/lib/rent-review';
import { buildPropertyWorkflowContext, tabActionsFor } from '@/lib/property-workflow-actions';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import { rentReviewJobRows } from '@/lib/property-job-rows';
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
import { formatDateTime } from '@/lib/utils';

type RentReviewHistorySortKey = 'leasePeriod' | 'term' | 'rent' | 'createdAt' | 'startDate';

function RentReviewHistoryTable({
  rows,
  propertyId,
}: {
  rows: RentReviewSummaryRow[];
  propertyId: string;
}) {
  const { sortKey, sortDirection, onSort } = useClientTableSort<RentReviewHistorySortKey>(
    'createdAt',
    'desc',
  );

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'leasePeriod':
          cmp = compareStrings(a.leasePeriod, b.leasePeriod);
          break;
        case 'term':
          cmp = compareStrings(a.termLabel, b.termLabel);
          break;
        case 'rent':
          cmp = compareStrings(a.rentLabel, b.rentLabel);
          break;
        case 'createdAt':
          cmp = compareSortTime(
            rentReviewCreatedAtIso(a.review),
            rentReviewCreatedAtIso(b.review),
          );
          break;
        case 'startDate':
          cmp = compareSortTime(a.startDateIso, b.startDateIso);
          break;
      }
      return applySortDirection(cmp, sortDirection);
    });
    return copy;
  }, [rows, sortDirection, sortKey]);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <SortableTableHeader
                label="Lease period"
                sortKey="leasePeriod"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Term"
                sortKey="term"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Rent"
                sortKey="rent"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Date created"
                sortKey="createdAt"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Start date"
                sortKey="startDate"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Open
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/20">
                <td className="px-3 py-3 font-medium">{row.leasePeriod}</td>
                <td className="px-3 py-3">{row.termLabel}</td>
                <td className="px-3 py-3 tabular-nums">{row.rentLabel}</td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                  {(() => {
                    const iso = rentReviewCreatedAtIso(row.review);
                    return iso ? formatDateTime(iso) : '—';
                  })()}
                </td>
                <td className="px-3 py-3 tabular-nums">{row.startDate}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={rentReviewDetail(row.review.id, fromProperty(propertyId, 'Rent Review'))}
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    onCreated: onWorkflowCreated,
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

  const rowOptions = useMemo(
    () => ({
      property,
      leasingRecords,
      currentLease,
      rentReviewDecisions,
    }),
    [property, leasingRecords, currentLease, rentReviewDecisions],
  );

  const historyRows = useMemo(
    () => buildRentReviewHistoryRows(rentReviews, rowOptions),
    [rentReviews, rowOptions],
  );

  const jobRows = useMemo(
    () => rentReviewJobRows(rentReviews, rentReviewDecisions),
    [rentReviews, rentReviewDecisions],
  );

  const handleRowClick = (id: string) => {
    setSelectedCaseId(id);
    setDialogReview(rentReviews.find((review) => review.id === id) ?? null);
  };

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
          Click a case to open the full rent review workflow. Countdown tracks the agent&apos;s{' '}
          {RENT_REVIEW_CONDUCT_WINDOW_DAYS}-day conduct window (review opens{' '}
          {RENT_REVIEW_ADVANCE_ORDER_DAYS} days before lease end;{' '}
          {RENT_REVIEW_STATUTORY_NOTICE_DAYS} days remain for the statutory tenant notice).
        </p>
        <PropertyJobCasesTable
          rows={jobRows}
          showRentReviewSchedule
          dateColumnLabel="Due date"
          selectedId={selectedCaseId}
          onRowClick={handleRowClick}
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
        <div>
          <h3 className="text-sm font-semibold">History</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Completed rent reviews — start date is when the new rent took effect.
          </p>
        </div>

        {historyRows.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No rent review history"
            description="Past rent reviews will appear here once completed."
          />
        ) : (
          <RentReviewHistoryTable rows={historyRows} propertyId={propertyId} />
        )}
      </section>

      {deletedRentReviews.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Deleted</h3>
          <p className="text-muted-foreground text-xs">
            Cancelled rent reviews for this property, with the reason recorded at deletion.
          </p>
          <ArchivedRentReviewsTable items={deletedRentReviews} />
        </section>
      ) : null}

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
        description="The rent review moves to the Deleted section below and the global Archive. A reason is required."
        confirmLabel="Delete rent review"
        onConfirm={handleDeleteConfirm}
        onSuccess={() => setDeleteTarget(null)}
      />
    </div>
  );
}
