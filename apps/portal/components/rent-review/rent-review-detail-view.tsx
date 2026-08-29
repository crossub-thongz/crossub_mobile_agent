'use client';

import { useCallback, useEffect } from 'react';

import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { CaseAddressAssignedBar } from '@/components/agent/case-address-assigned-bar';
import { RentEquivalentsHint } from '@/components/rent-equivalents-hint';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { RentReviewAgentWorkflowPanel } from '@/components/rent-review/rent-review-agent-workflow-panel';
import { RentReviewTaskDetailView } from '@/components/rent-review/rent-review-task-detail-view';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { useLivePoll } from '@/lib/use-live-poll';
import { resolvePropertyDisplayAddress } from '@/lib/property-address';
import { formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export function RentReviewDetailView({
  reviewId,
  leaseEndDate,
  apiConnected,
  hideHeader = false,
}: {
  reviewId: string;
  leaseEndDate?: string | null;
  apiConnected: boolean;
  hideHeader?: boolean;
}) {
  const loadCase = useRentReviewStore((s) => s.loadCase);
  const detail = useRentReviewStore((s) => s.getCase(reviewId));
  const status = useRentReviewStore((s) => s.status[reviewId] ?? 'idle');
  const error = useRentReviewStore((s) => s.error[reviewId]);

  const refresh = useCallback(async () => {
    await loadCase(reviewId, leaseEndDate);
  }, [reviewId, leaseEndDate, loadCase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLivePoll(refresh, apiConnected && Boolean(reviewId));

  if (status === 'loading' && !detail) {
    return <p className="text-muted-foreground text-sm">Loading rent review…</p>;
  }

  if (status === 'error' && !detail) {
    return <p className="text-destructive text-sm">{error ?? 'Could not load rent review'}</p>;
  }

  if (!detail) {
    return <p className="text-muted-foreground text-sm">Rent review not found.</p>;
  }

  return (
    <RentReviewDetailContent detail={detail} hideHeader={hideHeader} onUpdated={() => void refresh()} />
  );
}

function RentReviewDetailContent({
  detail,
  hideHeader = false,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  hideHeader?: boolean;
  onUpdated?: () => void;
}) {
  const isV2 = useIsAgentUiV2();
  const { properties } = useAgentData();

  const handleUpdated = (_updated: RentReviewWorkflowDetail) => {
    onUpdated?.();
  };

  if (isV2 && !hideHeader) {
    return <RentReviewTaskDetailView detail={detail} onUpdated={handleUpdated} />;
  }

  const displayAddress = resolvePropertyDisplayAddress(
    properties,
    detail.propertyId ?? '',
    detail.propertyAddress,
  );
  const propertyManager = detail.propertyId
    ? properties.find((p) => p.id === detail.propertyId)?.propertyManager
    : undefined;

  const handleUpdatedInner = (_updated: RentReviewWorkflowDetail) => {
    onUpdated?.();
  };

  return (
    <div className="space-y-4">
      {!hideHeader ? (
        <>
          <section className="rounded-2xl border bg-card p-4">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Case ref {workflowCaseReferenceLabel(detail.id, 'rent_review')}
            </p>
            <CaseAddressAssignedBar
              address={displayAddress}
              assignedToName={propertyManager}
              titleClassName="mt-1 text-base font-semibold"
              subtitle={<p className="text-muted-foreground text-xs">{detail.tenantName}</p>}
            />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  Current rent
                  <RentEquivalentsHint weekly={detail.currentWeeklyRent} />
                </p>
                <p className="font-medium tabular-nums">{formatCurrency(detail.currentWeeklyRent)}/wk</p>
              </div>
              <div>
                <p className="text-muted-foreground">Review due</p>
                <p className="font-medium">
                  {detail.rentReviewDate ? formatDate(detail.rentReviewDate) : '—'}
                </p>
              </div>
            </div>
          </section>

          {detail.propertyId ? (
            <CaseContactActions propertyId={detail.propertyId} caseLabel="Rent review" />
          ) : null}
        </>
      ) : null}

      <RentReviewAgentWorkflowPanel detail={detail} onUpdated={handleUpdatedInner} />
    </div>
  );
}
