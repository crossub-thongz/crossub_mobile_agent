'use client';

import { useMemo, useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { SectionStatusGrid } from '@/components/agent/section-status-grid';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { EmptyState } from '@/components/agent/empty-state';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';

const MODULE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Maintenance', label: 'Maintenance' },
  { id: 'Inspection', label: 'Inspections' },
  { id: 'Rent review', label: 'Rent review' },
  { id: 'Vacating', label: 'Vacating' },
];

export default function StatusPage() {
  const { taskStatusList, sectionStatus } = useAgentData();
  const [filter, setFilter] = useState('all');

  const list = useMemo(() => {
    if (filter === 'all') return taskStatusList;
    return taskStatusList.filter((t) => t.module === filter);
  }, [taskStatusList, filter]);

  return (
    <AgentShell title="Status">
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Every active task — address, job, and current status.
        </p>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">By section</h2>
          <SectionStatusGrid sections={sectionStatus} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">All tasks</h2>
          <FilterChips options={MODULE_FILTERS} value={filter} onChange={setFilter} />
          {list.length === 0 ? (
            <EmptyState
              title="No active tasks"
              description="Everything in this section is up to date."
            />
          ) : (
            <div className="space-y-2">
              {list.map((item) => (
                <TaskStatusRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AgentShell>
  );
}
