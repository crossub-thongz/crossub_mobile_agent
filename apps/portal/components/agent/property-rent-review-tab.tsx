'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { PropertyLeasingWorkflowActions } from '@/components/agent/property-leasing-workflow-actions';
import { Button } from '@/components/ui/button';
import { rentReviewDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import {
  buildCurrentRentReviewRow,
  buildRentReviewHistoryRows,
  findCurrentRentReview,
  type RentReviewSummaryRow,
} from '@/lib/property-rent-review-history';
import { isRentReviewPendingApproval, type RentReviewDecision } from '@/lib/rent-review';
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
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { rentReviewJobRows } from '@/lib/property-job-rows';
import { cn } from '@/lib/utils';

function RentReviewDataTable({
  rows,
  propertyId,
  onViewRentReview,
  showActions = false,
  pendingReviewId,
}: {
  rows: RentReviewSummaryRow[];
  propertyId: string;
  onViewRentReview?: (reviewId: string) => void;
  showActions?: boolean;
  pendingReviewId?: string;
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
              {showActions ? (
                <th className="px-3 py-3 text-right font-semibold">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const pending = pendingReviewId === row.id;

              return (
                <tr key={row.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-3 py-3">
                    <p className="font-medium">{row.leasePeriod}</p>
                    {pending ? (
                      <p className="text-amber-700 mt-0.5 text-[11px] font-medium dark:text-amber-400">
                        Needs approval
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">{row.termLabel}</td>
                  <td className="px-3 py-3 tabular-nums">{row.rentLabel}</td>
                  <td className="px-3 py-3 tabular-nums">{row.startDate}</td>
                  {showActions ? (
                    <td className="px-3 py-3">
                      <div className="flex justify-end flex-wrap gap-2">
                        {onViewRentReview ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onViewRentReview(row.review.id)}
                          >
                            View
                          </Button>
                        ) : null}
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <Link
                            href={rentReviewDetail(
                              row.review.id,
                              fromProperty(propertyId, 'Rent Review'),
                            )}
                          >
                            <ExternalLink className="size-3.5" />
                            Open
                          </Link>
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
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
  const rowOptions = useMemo(
    () => ({
      property,
      leasingRecords,
      currentLease,
      rentReviewDecisions,
    }),
    [property, leasingRecords, currentLease, rentReviewDecisions],
  );

  const currentReview = useMemo(
    () => findCurrentRentReview(rentReviews, rentReviewDecisions),
    [rentReviews, rentReviewDecisions],
  );

  const currentRow = useMemo(
    () => (currentReview ? buildCurrentRentReviewRow(currentReview, rowOptions) : null),
    [currentReview, rowOptions],
  );

  const historyRows = useMemo(
    () => buildRentReviewHistoryRows(rentReviews, rowOptions),
    [rentReviews, rowOptions],
  );

  const currentPending =
    currentReview != null &&
    isRentReviewPendingApproval(currentReview, rentReviewDecisions[currentReview.id]);

  const jobRows = useMemo(
    () => rentReviewJobRows(rentReviews, rentReviewDecisions),
    [rentReviews, rentReviewDecisions],
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Rent review cases</h3>
        <PropertyJobCasesTable
          rows={jobRows}
          emptyTitle="No rent review cases"
          emptyDescription="Start a rent review when the lease is due for renewal."
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">New rent review</h3>
          {currentReview ? (
            <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              Current
            </span>
          ) : null}
        </div>

        {currentRow ? (
          <RentReviewDataTable
            rows={[currentRow]}
            propertyId={propertyId}
            onViewRentReview={onViewRentReview}
            showActions
            pendingReviewId={currentPending ? currentReview.id : undefined}
          />
        ) : (
          <div
            className={cn(
              'rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-5',
            )}
          >
            <p className="text-muted-foreground text-sm">
              No rent review in progress. Start one when the lease is due for review.
            </p>
            <div className="mt-3">
              <PropertyLeasingWorkflowActions
                tab="rent_review"
                inline
                property={property}
                propertyId={propertyId}
                leasingCycles={leasingCycles}
                rentReviews={rentReviews}
                vacatingCases={vacatingCases}
                maintenance={maintenance}
                inspections={inspections}
                tribunalCases={tribunalCases}
                tenantSelections={tenantSelections}
                currentLease={currentLease}
                onCreated={onWorkflowCreated}
              />
            </div>
          </div>
        )}
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
          <RentReviewDataTable rows={historyRows} propertyId={propertyId} />
        )}
      </section>
    </div>
  );
}
