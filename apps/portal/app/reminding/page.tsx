'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBadge } from '@/components/agent/status-badge';
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

  return (
    <AgentShell title="Reminding">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Everything that needs your action — approvals, arrears, inspections, and
          leasing.
        </p>
        <FilterChips options={CATEGORY_FILTERS} value={filter} onChange={setFilter} />
        {list.length === 0 ? (
          <EmptyState
            title="All caught up"
            description="No items need your action right now."
          />
        ) : (
          <div className="space-y-2">
            {list.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={item.category} priority={item.priority} />
                    </div>
                    <p className="truncate text-sm font-semibold">{item.propertyAddress}</p>
                    <p className="text-sm">{item.label}</p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
