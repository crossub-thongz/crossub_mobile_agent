'use client';

import { useCallback, useEffect } from 'react';

import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { RentReviewAgentWorkflowPanel } from '@/components/rent-review/rent-review-agent-workflow-panel';
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
  const { properties } = useAgentData();
  const displayAddress = resolvePropertyDisplayAddress(
    properties,
    detail.propertyId ?? '',
    detail.propertyAddress,
  );

  const handleUpdated = (_updated: RentReviewWorkflowDetail) => {
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
            <h1 className="mt-1 text-base font-semibold">{displayAddress}</h1>
            <p className="text-muted-foreground mt-1 text-xs">{detail.tenantName}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Current rent</p>
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

      <RentReviewAgentWorkflowPanel detail={detail} onUpdated={handleUpdated} />

      {detail.propertyId ? (
        <ModuleCommunications
          propertyId={detail.propertyId}
          categories={['Leasing']}
          title="Rent review communications"
        />
      ) : null}
    </div>
  );
}
