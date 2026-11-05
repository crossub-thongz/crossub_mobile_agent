'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { LeasingModule } from '@/components/agent/module-workspace/leasing-module';
import { TasksFilterRedirect } from '@/components/agent/module-workspace/tasks-filter-redirect';
import { TenancyReviewModule } from '@/components/agent/module-workspace/tenancy-review-module';
import { VacatingModule } from '@/components/agent/module-workspace/vacating-module';
import { AgentShell } from '@/components/layout/agent-shell';
import { LEASING_VIEW_EVENT, leasingViewHref, notifyLeasingView } from '@/constants/module-training';
import {
  LEASING_PAGE_VIEW,
  LEASING_PAGE_VIEW_LABEL,
  LEASING_WORKSPACE_COPY,
  type LeasingPageView,
} from '@/constants/module-workspace';
import { ROUTES } from '@/constants/routes';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

const VIEW_OPTIONS = Object.values(LEASING_PAGE_VIEW).map((id) => ({
  id,
  label: LEASING_PAGE_VIEW_LABEL[id],
}));

/**
 * Leasing list hub is retired for every other tier: they view and create jobs on Tasks.
 * Self-Manage agents get the desktop leasing page. A row on Lettings, Tenancy reviews, or
 * Vacating opens the full task.
 */
function viewFromLocation(): LeasingPageView {
  if (typeof window === 'undefined') return LEASING_PAGE_VIEW.LETTINGS;
  const view = new URLSearchParams(window.location.search).get('view');
  if (view === LEASING_PAGE_VIEW.TENANCY_REVIEWS || view === LEASING_PAGE_VIEW.VACATING) return view;
  return LEASING_PAGE_VIEW.LETTINGS;
}

export default function LeasingPage() {
  const router = useRouter();
  const { ready, selfManaged } = useSelfManagedAccess();
  const [view, setViewState] = useState<LeasingPageView>(LEASING_PAGE_VIEW.LETTINGS);

  useEffect(() => {
    const sync = (event?: Event) => {
      const detail = event ? (event as CustomEvent<LeasingPageView>).detail : null;
      if (
        detail === LEASING_PAGE_VIEW.LETTINGS ||
        detail === LEASING_PAGE_VIEW.TENANCY_REVIEWS ||
        detail === LEASING_PAGE_VIEW.VACATING
      ) {
        setViewState(detail);
        return;
      }
      setViewState(viewFromLocation());
    };
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener(LEASING_VIEW_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(LEASING_VIEW_EVENT, sync);
    };
  }, []);

  const setView = (next: LeasingPageView) => {
    setViewState(next);
    notifyLeasingView(next);
    const href = leasingViewHref(next);
    if (href === ROUTES.LEASING) router.replace(ROUTES.LEASING);
    else router.replace(href);
  };

  if (!ready) return null;
  if (!selfManaged) return <TasksFilterRedirect filter="Leasing" />;

  return (
    <AgentShell title={LEASING_WORKSPACE_COPY.title} wide fillMain hideNeedAction>
      <div className="shrink-0 lg:px-6 lg:pt-4">
        <FilterChips options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>
      {view === LEASING_PAGE_VIEW.TENANCY_REVIEWS ? (
        <TenancyReviewModule />
      ) : view === LEASING_PAGE_VIEW.VACATING ? (
        <VacatingModule />
      ) : (
        <LeasingModule />
      )}
    </AgentShell>
  );
}
