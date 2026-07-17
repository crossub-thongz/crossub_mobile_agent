'use client';

import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { RentReviewListTable } from '@/components/agent/portfolio-module-tables';
import { AgentShell } from '@/components/layout/agent-shell';
import { Input } from '@/components/ui/input';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import { rentReviewToJobRow } from '@/lib/portfolio-case-dialog';
import { isRentReviewDecided } from '@/lib/rent-review';
import { useAgentStore } from '@/lib/store';

const VIEW_FILTERS = [
  { id: 'current', label: 'Current' },
  { id: 'completed', label: 'Completed' },
];

export default function RentReviewPage() {
  const { rentReviews } = useAgentData();
  const decisions = useAgentStore((s) => s.rentReviewDecisions);
  const { selectedJob, selectedId, openJob, closeJob } = usePortfolioCaseDialog();
  const [view, setView] = useState('current');
  const [search, setSearch] = useState('');

  const { current, completed } = useMemo(() => {
    const cur: typeof rentReviews = [];
    const done: typeof rentReviews = [];
    for (const r of rentReviews) {
      const decision = decisions[r.id];
      if (isRentReviewDecided(r, decision)) done.push(r);
      else cur.push(r);
    }
    return { current: cur, completed: done };
  }, [rentReviews, decisions]);

  const list = useMemo(() => {
    const base = view === 'current' ? current : completed;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (r) =>
        r.propertyAddress.toLowerCase().includes(q) ||
        (r.tenantName?.toLowerCase().includes(q) ?? false),
    );
  }, [view, current, completed, search]);
  const back = useBackNavigation(ROUTES.DASHBOARD, 'Dashboard');

  return (
    <AgentShell title="Rent Review" backHref={back.href} backLabel={back.label}>
      <div className="space-y-4">
        <FilterChips options={VIEW_FILTERS} value={view} onChange={setView} />
        <Input
          placeholder="Search by property or tenant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

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
          <RentReviewListTable
            items={list}
            selectedId={selectedId}
            onItemClick={(item) => openJob(rentReviewToJobRow(item, decisions))}
          />
        )}
        <PortfolioCaseDialogHost
          job={selectedJob}
          onClose={closeJob}
          onOpenJob={openJob}
        />
      </div>
    </AgentShell>
  );
}
