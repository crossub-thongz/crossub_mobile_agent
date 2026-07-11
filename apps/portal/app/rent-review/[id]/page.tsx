'use client';

import { notFound, useParams } from 'next/navigation';

import { DataSourceBadge } from '@/components/agent/data-source-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { RentReviewDetailView } from '@/components/rent-review/rent-review-detail-view';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';

export default function RentReviewDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { rentReviews, apiConnected } = useAgentData();
  const listItem = rentReviews.find((r) => r.id === id);
  const back = useBackNavigation(ROUTES.RENT_REVIEW, 'Rent reviews');

  if (!listItem && !apiConnected) notFound();

  return (
    <AgentShell title="Rent Review" backHref={back.href} backLabel={back.label}>
      <div className="space-y-4">
        <DataSourceBadge source={apiConnected ? 'api' : 'offline'} />
        <RentReviewDetailView
          reviewId={id}
          leaseEndDate={listItem?.leaseEnd}
          apiConnected={apiConnected}
        />
      </div>
    </AgentShell>
  );
}
