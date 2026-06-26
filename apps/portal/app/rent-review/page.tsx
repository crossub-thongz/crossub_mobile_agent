'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { rentReviewDetail, ROUTES } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import type { DetailNavContext } from '@/lib/detail-navigation';
import { useAgentStore } from '@/lib/store';

const VIEW_FILTERS = [
  { id: 'current', label: 'Current' },
  { id: 'completed', label: 'Completed' },
];

export default function RentReviewPage() {
  const searchParams = useSearchParams();
  const { rentReviews } = useAgentData();
  const decisions = useAgentStore((s) => s.rentReviewDecisions);
  const [view, setView] = useState('current');

  const detailNav = useMemo((): DetailNavContext | undefined => {
    const from = searchParams.get('from');
    const propertyId = searchParams.get('propertyId');
    if (from === 'property' && propertyId) {
      return {
        from: 'property',
        propertyId,
        tab: searchParams.get('tab') ?? undefined,
      };
    }
    return undefined;
  }, [searchParams]);

  const { current, completed } = useMemo(() => {
    const cur: typeof rentReviews = [];
    const done: typeof rentReviews = [];
    for (const r of rentReviews) {
      const decided = Boolean(decisions[r.id]);
      const isComplete =
        decided ||
        r.status.toLowerCase().includes('confirm') ||
        r.status.toLowerCase().includes('complete');
      if (isComplete) done.push(r);
      else cur.push(r);
    }
    return { current: cur, completed: done };
  }, [rentReviews, decisions]);

  const list = view === 'current' ? current : completed;
  const back = useBackNavigation(ROUTES.DASHBOARD, 'Dashboard');

  return (
    <AgentShell title="Rent Review" backHref={back.href} backLabel={back.label}>
      <div className="space-y-4">
        <FilterChips options={VIEW_FILTERS} value={view} onChange={setView} />

        {list.length === 0 ? (
          <EmptyState
            title={view === 'current' ? 'No active rent reviews' : 'No completed reviews'}
            description={
              view === 'current'
                ? 'Upcoming and pending rent reviews will appear here.'
                : 'Confirmed and completed rent reviews are listed here.'
            }
          />
        ) : (
          <div className="space-y-2">
            {list.map((r) => (
              <TaskStatusRow
                key={r.id}
                item={{
                  id: r.id,
                  propertyAddress: r.propertyAddress,
                  taskLabel: 'Rent review',
                  status: decisions[r.id]
                    ? decisions[r.id]?.action === 'confirmed'
                      ? 'Confirmed'
                      : 'Custom amount submitted'
                    : r.status,
                  href: rentReviewDetail(r.id, detailNav),
                  module: 'Rent review',
                  tone:
                    r.requiresApproval && !decisions[r.id]
                      ? 'warning'
                      : r.tenantResponse === 'counter'
                        ? 'neutral'
                        : 'ok',
                  requiresApproval: r.requiresApproval && !decisions[r.id],
                }}
              />
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
