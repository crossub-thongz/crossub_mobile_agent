'use client';

import { useParams } from 'next/navigation';

import { ModuleCommunications } from '@/components/agent/module-communications';
import { TaskJobLoading, TaskJobUnavailable } from '@/components/agent/tasks/task-job-status';
import { TribunalAwaitingAccountManagerPanel } from '@/components/agent/tribunal-awaiting-account-manager';
import { TribunalRentChasingDetail } from '@/components/agent/tribunal-rent-chasing-detail';
import { TribunalTaskDetailView } from '@/components/agent/tribunal-task-detail-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { ROUTES, tribunalDetail } from '@/constants/routes';
import { isRentChasingTribunalCase } from '@/lib/tribunal-case-kind';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';

export default function TribunalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const isV2 = useIsAgentUiV2();
  const { tribunalCases, loading } = useAgentData();
  const c = tribunalCases.find((x) => x.id === id);
  const back = useBackNavigation(isV2 ? ROUTES.TASKS : ROUTES.TRIBUNAL, isV2 ? 'Tasks' : 'Tribunal');

  useRecordRecentCaseVisit({
    id: c?.id,
    kind: 'tribunal',
    address: c?.propertyAddress,
    href: c ? tribunalDetail(c.id) : '',
    module: 'tribunal',
  });

  if (loading && !c) {
    return (
      <AgentShell
        wide={isV2}
        title={isV2 ? undefined : 'Tribunal case'}
        backHref={back.href}
        backLabel={back.label}
        hideGlobalFabs={isV2}
        hideNeedAction={isV2}
      >
        <TaskJobLoading label="Loading tribunal…" />
      </AgentShell>
    );
  }

  if (!c) {
    return (
      <AgentShell
        wide={isV2}
        title={isV2 ? undefined : 'Tribunal case'}
        backHref={back.href}
        backLabel={back.label}
        hideGlobalFabs={isV2}
        hideNeedAction={isV2}
      >
        <TaskJobUnavailable
          title="Tribunal case not found"
          description="This case may still be saving. Open it from Tasks in a moment."
        />
      </AgentShell>
    );
  }

  const rentChasing = isRentChasingTribunalCase(c.matter, c.tribunalType);

  return (
    <AgentShell
      wide={isV2}
      title={isV2 ? undefined : 'Tribunal case'}
      backHref={back.href}
      backLabel={back.label}
      hideGlobalFabs={isV2}
      hideNeedAction={isV2}
    >
      {isV2 ? (
        <TribunalTaskDetailView tribunalCase={c} rentChasing={rentChasing} />
      ) : (
        <div className="space-y-4">
          {rentChasing ? (
            <TribunalRentChasingDetail caseId={c.id} />
          ) : (
            <TribunalAwaitingAccountManagerPanel kind="tribunal" />
          )}

          <ModuleCommunications
            propertyId={c.propertyId}
            categories={['Tribunal']}
            title="Tribunal communications"
          />
        </div>
      )}
    </AgentShell>
  );
}
