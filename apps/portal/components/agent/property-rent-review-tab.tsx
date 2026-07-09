'use client';

import Link from 'next/link';
import { ExternalLink, RefreshCw } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { Button } from '@/components/ui/button';
import { rentReviewDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { isRentReviewPendingApproval, type RentReviewDecision } from '@/lib/rent-review';
import type { RentReviewCase } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function PropertyRentReviewTab({
  propertyId,
  rentReviews,
  rentReviewDecisions,
  onViewRentReview,
}: {
  propertyId: string;
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  onViewRentReview?: (reviewId: string) => void;
}) {
  if (rentReviews.length === 0) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="No rent reviews yet"
        description="Rent review cases for this property will appear here when created."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Rent review cases linked to this property, newest activity first.
      </p>
      <ul className="space-y-2">
        {rentReviews.map((review) => {
          const decision = rentReviewDecisions[review.id];
          const pending = isRentReviewPendingApproval(review, decision);
          const statusLabel = decision
            ? decision.action === 'confirmed'
              ? 'Confirmed'
              : 'Custom amount submitted'
            : review.status;

          return (
            <li
              key={review.id}
              className="rounded-xl border border-border/70 bg-card px-3 py-3 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Due {formatDate(review.reviewDue)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Current {formatCurrency(review.currentRent)}/wk
                    {review.suggestedRent != null
                      ? ` · Proposed ${formatCurrency(review.suggestedRent)}/wk`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs font-medium">{statusLabel}</p>
                  {pending ? (
                    <p className="text-amber-700 text-[11px] font-medium dark:text-amber-400">
                      Needs approval
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {onViewRentReview ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onViewRentReview(review.id)}
                    >
                      View details
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link
                      href={rentReviewDetail(
                        review.id,
                        fromProperty(propertyId, 'Rent Review'),
                      )}
                    >
                      <ExternalLink className="size-3.5" />
                      Open case
                    </Link>
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
