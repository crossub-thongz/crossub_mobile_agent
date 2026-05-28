'use client';

import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBanner } from '@/components/agent/status-banner';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { maintenanceDetail } from '@/constants/routes';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'approval', label: 'Needs approval' },
];

export default function MaintenancePage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { maintenanceAll, sectionStatus } = useAgentData();

  const summary = sectionStatus.find((s) => s.id === 'maintenance');

  const list = useMemo(() => {
    let items = [...maintenanceAll];
    if (filter === 'approval')
      items = items.filter((m) => m.requiresApproval);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.propertyAddress.toLowerCase().includes(q),
      );
    }
    return items.map((m) => ({
      id: m.id,
      propertyAddress: m.propertyAddress,
      taskLabel: m.title,
      status: m.status,
      href: maintenanceDetail(m.id),
      module: 'Maintenance',
      tone:
        m.priority === 'urgent'
          ? ('urgent' as const)
          : m.requiresApproval
            ? ('warning' as const)
            : ('neutral' as const),
      requiresApproval: m.requiresApproval,
    }));
  }, [maintenanceAll, filter, search]);

  return (
    <AgentShell title="Maintenance">
      <div className="space-y-4">
        <StatusBanner
          status={summary?.statusLabel ?? 'No jobs'}
          tone={
            summary?.tone === 'urgent'
              ? 'urgent'
              : summary?.tone === 'warning'
                ? 'action'
                : 'ok'
          }
        />

        <Input
          placeholder="Search by address or issue…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {list.length === 0 ? (
          <EmptyState
            title={search || filter !== 'all' ? 'No matching jobs' : 'No maintenance jobs'}
            description={
              filter === 'approval'
                ? 'Nothing waiting for your approval right now.'
                : 'Open maintenance requests will appear here.'
            }
          />
        ) : (
          <div className="space-y-2">
            {list.map((item) => (
              <TaskStatusRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
