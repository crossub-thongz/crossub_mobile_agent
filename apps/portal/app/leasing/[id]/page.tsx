'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { NewLeasingTaskDetailView } from '@/components/leasing-workflow/new-leasing-task-detail-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { ROUTES, leasingDetail } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';

export default function LeasingTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cycleId = String(params.id);
  const isV2 = useIsAgentUiV2();
  const back = useBackNavigation(ROUTES.TASKS, 'Tasks');

  useRecordRecentCaseVisit({
    id: cycleId,
    kind: 'leasing',
    href: leasingDetail(cycleId),
    module: 'leasing',
  });

  useEffect(() => {
    if (isV2) return;
    router.replace(ROUTES.LEASING);
  }, [isV2, router]);

  if (!isV2) {
    return null;
  }

  return (
    <AgentShell
      title="New lease"
      backHref={back.href}
      backLabel={back.label}
      hideGlobalFabs
      hideNeedAction
      wide
    >
      <NewLeasingTaskDetailView cycleId={cycleId} />
    </AgentShell>
  );
}
