'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { StatusBadge } from '@/components/agent/status-badge';
import { Timeline } from '@/components/agent/timeline';
import { Button } from '@/components/ui/button';
import { rentReviewDetail } from '@/constants/routes';
import type { DetailNavContext } from '@/lib/detail-navigation';
import { buildRentReviewTimeline, isRentReviewDecided } from '@/lib/rent-review';
import { useAgentStore } from '@/lib/store';
import type { RentReviewCase } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function RentReviewDetailDialog({
  open,
  onClose,
  review,
  navContext,
  size = 'default',
}: {
  open: boolean;
  onClose: () => void;
  review: RentReviewCase | null;
  navContext?: DetailNavContext;
  size?: 'default' | 'wide' | 'xl';
}) {
  const decision = useAgentStore((s) =>
    review ? s.rentReviewDecisions[review.id] : undefined,
  );
  const timeline = useMemo(
    () => (review ? buildRentReviewTimeline(review, decision) : []),
    [review, decision],
  );

  if (!review) return null;

  const decided = isRentReviewDecided(review, decision);

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title="Rent review"
      subtitle={review.propertyAddress}
      size={size}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={decided ? 'Decision recorded' : review.status}
            variant={review.requiresApproval && !decided ? 'approval' : 'default'}
          />
          {review.tenantResponse && review.tenantResponse !== 'pending' && (
            <span className="text-muted-foreground text-xs capitalize">
              Tenant: {review.tenantResponse}
            </span>
          )}
        </div>

        <div className="rounded-xl border bg-card p-3 text-xs">
          <dl className="grid grid-cols-2 gap-2">
            <div>
              <dt className="text-muted-foreground">Lease</dt>
              <dd className="font-medium">
                {formatDate(review.leaseStart)} – {formatDate(review.leaseEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Review due</dt>
              <dd className="font-medium">{formatDate(review.reviewDue)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Current rent</dt>
              <dd className="font-medium">{formatCurrency(review.currentRent)}/wk</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">CROSSUB suggested</dt>
              <dd className="text-primary font-medium">
                {formatCurrency(review.suggestedRent)}/wk
              </dd>
            </div>
            {review.counterOffer != null && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Tenant counter</dt>
                <dd className="font-medium">{formatCurrency(review.counterOffer)}/wk</dd>
              </div>
            )}
          </dl>
        </div>

        {decision && (
          <div className="rounded-xl border bg-primary/5 p-3 text-xs">
            Decision recorded:{' '}
            {decision.action === 'confirmed'
              ? `Agreed ${formatCurrency(review.suggestedRent)}/wk`
              : `Proposed ${formatCurrency(decision.amount ?? 0)}/wk`}
          </div>
        )}

        {review.negotiationHistory && review.negotiationHistory.length > 0 && (
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-2 text-xs font-semibold">Negotiation history</p>
            <ul className="space-y-2 text-xs">
              {review.negotiationHistory.map((entry, i) => (
                <li key={`${entry.at}-${i}`} className="border-b border-border pb-2 last:border-0">
                  <p className="font-medium">
                    {entry.party} · {formatCurrency(entry.amount)}/wk
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {formatDate(entry.at)}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {timeline.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Timeline
            </p>
            <Timeline entries={timeline} />
          </div>
        )}

        <Button variant="outline" className="w-full" asChild>
          <Link href={rentReviewDetail(review.id, navContext)} onClick={onClose}>
            Open full workflow
          </Link>
        </Button>
      </div>
    </CaseDetailDialog>
  );
}
