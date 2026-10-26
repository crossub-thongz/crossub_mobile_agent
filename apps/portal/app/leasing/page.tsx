'use client';

import { useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { LeasingModule } from '@/components/agent/module-workspace/leasing-module';
import { TasksFilterRedirect } from '@/components/agent/module-workspace/tasks-filter-redirect';
import { TenancyReviewModule } from '@/components/agent/module-workspace/tenancy-review-module';
import { AgentShell } from '@/components/layout/agent-shell';
import {
  LEASING_PAGE_VIEW,
  LEASING_PAGE_VIEW_LABEL,
  LEASING_WORKSPACE_COPY,
  type LeasingPageView,
} from '@/constants/module-workspace';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

const VIEW_OPTIONS = Object.values(LEASING_PAGE_VIEW).map((id) => ({
  id,
  label: LEASING_PAGE_VIEW_LABEL[id],
}));

/**
 * Leasing list hub is retired for every other tier: they view and create jobs on Tasks.
 * Self-Manage agents get the desktop leasing page instead (list-and-detail split pane): their
 * lettings, and the tenancy reviews (rent reviews and lease renewals) they run themselves.
 */
export default function LeasingPage() {
  const { ready, selfManaged } = useSelfManagedAccess();
  const [view, setView] = useState<LeasingPageView>(LEASING_PAGE_VIEW.LETTINGS);

  if (!ready) return null;
  if (!selfManaged) return <TasksFilterRedirect filter="Leasing" />;

  return (
    <AgentShell title={LEASING_WORKSPACE_COPY.title} wide fillMain hideNeedAction>
      <div className="shrink-0 lg:px-6 lg:pt-4">
        <FilterChips options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>
      {view === LEASING_PAGE_VIEW.TENANCY_REVIEWS ? <TenancyReviewModule /> : <LeasingModule />}
    </AgentShell>
  );
}
