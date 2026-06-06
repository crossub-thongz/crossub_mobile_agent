'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBanner } from '@/components/agent/status-banner';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { inspectionDetail } from '@/constants/routes';
import { formatDateTime } from '@/lib/utils';

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'INGOING', label: 'Ingoing' },
  { id: 'OUTGOING', label: 'Outgoing' },
  { id: 'ROUTINE', label: 'Routine' },
];

export default function InspectionsPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const { inspections, sectionStatus } = useAgentData();
  const [filter, setFilter] = useState(
    typeParam && TYPE_FILTERS.some((f) => f.id === typeParam) ? typeParam : 'all',
  );
  const [search, setSearch] = useState('');

  const summary = sectionStatus.find((s) => s.id === 'inspections');

  const list = useMemo(() => {
    let items = [...inspections];
    if (filter !== 'all') items = items.filter((i) => i.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) =>
        i.propertyAddress.toLowerCase().includes(q),
      );
    }
    return items.map((insp) => ({
      id: insp.id,
      propertyAddress: insp.propertyAddress,
      taskLabel: `${insp.type} inspection${insp.scheduledAt ? ` · ${formatDateTime(insp.scheduledAt)}` : ''}`,
      status: insp.status,
      href: inspectionDetail(insp.id),
      module: 'Inspection',
      tone: ['Scheduled', 'Confirmed', 'In Progress'].includes(insp.status)
        ? ('neutral' as const)
        : ('ok' as const),
    }));
  }, [inspections, filter, search]);

  return (
    <AgentShell title="Inspections">
      <div className="space-y-4">
        <StatusBanner
          status={summary?.statusLabel ?? 'Nothing scheduled'}
          tone="default"
        />

        <Input
          placeholder="Search by address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterChips options={TYPE_FILTERS} value={filter} onChange={setFilter} />

        <div className="space-y-2">
          {list.map((item) => (
            <TaskStatusRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </AgentShell>
  );
}
