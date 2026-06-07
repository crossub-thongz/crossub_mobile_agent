'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import { RemindingCard } from '@/components/agent/reminding-card';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Leasing', label: 'Leasing' },
  { id: 'Maintenance', label: 'Maintenance' },
  { id: 'Inspection', label: 'Inspection' },
  { id: 'Accounting', label: 'Accounting' },
  { id: 'Others', label: 'Others' },
];

export default function RemindingPage() {
  const { remindingItems } = useAgentData();
  const [filter, setFilter] = useState('all');

  const list = useMemo(() => {
    if (filter === 'all') return remindingItems;
    return remindingItems.filter((i) => i.category === filter);
  }, [remindingItems, filter]);

  const urgentCount = remindingItems.filter(
    (i) => i.priority === 'urgent' || i.priority === 'high',
  ).length;

  return (
    <AgentShell title="Reminding">
      <div className="space-y-4">
        <PageIntro description="Central action queue — everything that needs your approval or follow-up." />

        {remindingItems.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border bg-card p-3 text-center">
              <p className="text-muted-foreground text-[10px] font-medium uppercase">Total</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{remindingItems.length}</p>
            </div>
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-center">
              <p className="text-destructive text-[10px] font-medium uppercase">Urgent</p>
              <p className="text-destructive mt-1 text-2xl font-bold tabular-nums">{urgentCount}</p>
            </div>
          </div>
        )}

        <FilterChips options={CATEGORY_FILTERS} value={filter} onChange={setFilter} />

        {list.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description="No items need your action right now."
          />
        ) : (
          <div className="space-y-2.5">
            {list.map((item) => (
              <RemindingCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
