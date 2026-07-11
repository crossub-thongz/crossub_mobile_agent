'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { rentReviewDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { buildRentReviewHistoryRows, isActiveRentReview, type RentReviewSummaryRow } from '@/lib/property-rent-review-history';
import type { RentReviewDecision } from '@/lib/rent-review';
import { buildPropertyWorkflowContext, tabActionsFor } from '@/lib/property-workflow-actions';
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
import { rentReviewJobRows } from '@/lib/property-job-rows';
import { RENT_REVIEW_CONDUCT_WINDOW_DAYS } from '@/lib/rent-review/scheduling';

function RentReviewHistoryTable({
  rows,
  propertyId,
}: {
  rows: RentReviewSummaryRow[];
  propertyId: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 font-semibold">Lease period</th>
              <th className="px-3 py-3 font-semibold">Term</th>
              <th className="px-3 py-3 font-semibold">Rent</th>
              <th className="px-3 py-3 font-semibold">Start date</th>
              <th className="px-3 py-3 text-right font-semibold">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/20">
                <td className="px-3 py-3 font-medium">{row.leasePeriod}</td>
                <td className="px-3 py-3">{row.termLabel}</td>
                <td className="px-3 py-3 tabular-nums">{row.rentLabel}</td>
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
  onViewRentReview,
  onWorkflowCreated,
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
  onViewRentReview?: (reviewId: string) => void;
  onWorkflowCreated?: () => void;
}) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

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
    onViewRentReview?.(id);
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
          Click a case to open the full rent review workflow. Countdown shows days left in the{' '}
          {RENT_REVIEW_CONDUCT_WINDOW_DAYS}-day review window (order placed 90 days ahead; 60-day tenant notice required).
        </p>
        <PropertyJobCasesTable
          rows={jobRows}
          selectedId={selectedCaseId}
          onRowClick={handleRowClick}
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
    </div>
  );
}
