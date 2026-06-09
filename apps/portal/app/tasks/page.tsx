'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { NeedActionTaskCard } from '@/components/agent/need-action-task-card';
import { PageIntro } from '@/components/agent/page-intro';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Leasing', label: 'Leasing' },
  { id: 'Maintenance', label: 'Maintenance' },
  { id: 'Inspection', label: 'Inspection' },
  { id: 'Accounting', label: 'Accounting' },
  { id: 'Tribunal', label: 'Tribunal' },
];

export default function TasksPage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const { needActionItems } = useAgentData();
  const [filter, setFilter] = useState(
    urlFilter && CATEGORY_FILTERS.some((f) => f.id === urlFilter) ? urlFilter : 'all',
  );

  const list = useMemo(() => {
    if (filter === 'all') return needActionItems;
    return needActionItems.filter((i) => i.category === filter);
  }, [needActionItems, filter]);

  return (
    <AgentShell title="Need Action" hideNeedAction>
      <div className="space-y-4">
        <PageIntro description="Items that need your decision or action — sorted by urgency. Approve maintenance quotes inline where available." />

        <FilterChips options={CATEGORY_FILTERS} value={filter} onChange={setFilter} />

        {list.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description="Nothing needs your action right now."
          />
        ) : (
          <div className="space-y-2.5">
            {list.map((item) => (
              <NeedActionTaskCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
