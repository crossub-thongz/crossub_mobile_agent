'use client';

import { useEffect } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';

import { RentReviewDetailView } from '@/components/rent-review/rent-review-detail-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentNotificationDialog } from '@/components/providers/agent-notification-dialog-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { ROUTES, rentReviewDetail } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';

export default function RentReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const isV2 = useIsAgentUiV2();
  const back = useBackNavigation(ROUTES.TASKS, 'Tasks');
  const { loading, rentReviews, apiConnected } = useAgentData();
  const { openNotificationHref } = useAgentNotificationDialog();

  const review = rentReviews.find((row) => row.id === id);
  const leaseEndDate = review?.leaseEnd ?? null;

  useRecordRecentCaseVisit({
    id: review?.id ?? id,
    kind: 'rent_review',
    address: review?.propertyAddress,
    href: rentReviewDetail(id),
    module: 'rent_review',
  });

  useEffect(() => {
    if (isV2 || loading) return;
    openNotificationHref(rentReviewDetail(id));
    router.replace(ROUTES.RENT_REVIEW);
  }, [id, isV2, loading, openNotificationHref, router]);

  if (!isV2) {
    return null;
  }

  if (!loading && !review && !apiConnected) {
    notFound();
  }

  return (
    <AgentShell
      title="Rent review"
      backHref={back.href}
      backLabel={back.label}
      hideGlobalFabs
      wide
      hideNeedAction
    >
      <RentReviewDetailView
        reviewId={id}
        leaseEndDate={leaseEndDate}
        apiConnected={apiConnected}
      />
    </AgentShell>
  );
}
