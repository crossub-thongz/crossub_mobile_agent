'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentNotificationDialog } from '@/components/providers/agent-notification-dialog-provider';
import { ROUTES, rentReviewDetail } from '@/constants/routes';

/** Legacy deep links open the portfolio case popup instead of a full-page workflow. */
export default function RentReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { loading } = useAgentData();
  const { openNotificationHref } = useAgentNotificationDialog();

  useEffect(() => {
    if (loading) return;
    openNotificationHref(rentReviewDetail(id));
    router.replace(ROUTES.RENT_REVIEW);
  }, [id, loading, openNotificationHref, router]);

  return null;
}
