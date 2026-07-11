'use client';

import { RentReviewDetailView } from '@/components/rent-review/rent-review-detail-view';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { RentReviewCase } from '@/lib/types';

/** Inline rent-review workflow on the property Leasing tab. */
export function RentReviewWorkflowTimeline({
  review,
}: {
  review: RentReviewCase;
}) {
  const { apiConnected } = useAgentData();

  return (
    <RentReviewDetailView
      reviewId={review.id}
      leaseEndDate={review.leaseEnd}
      apiConnected={apiConnected}
      hideHeader
    />
  );
}
