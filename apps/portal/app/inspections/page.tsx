'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';

import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBanner } from '@/components/agent/status-banner';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { inspectionDetail } from '@/constants/routes';
import { formatDateTime } from '@/lib/utils';

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'OUTGOING', label: 'Outgoing' },
  { id: 'ROUTINE', label: 'Routine' },
];

export default function InspectionsPage() {
  const { inspections, sectionStatus } = useAgentData();
  const [filter, setFilter] = useState('all');
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
    return items;
  }, [inspections, filter, search]);

  return (
    <AgentShell title="Inspections">
      <div className="space-y-4">
        <StatusBanner
          status={summary?.statusLabel ?? 'Nothing scheduled'}
          tone="default"
        />

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by address…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips options={TYPE_FILTERS} value={filter} onChange={setFilter} />

        <div className="space-y-2">
          {list.map((insp) => (
            <Link
              key={insp.id}
              href={inspectionDetail(insp.id)}
              className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-primary text-xs font-medium">{insp.status}</p>
                  <p className="text-sm font-medium">{insp.propertyAddress}</p>
                  <p className="text-muted-foreground text-xs">
                    {insp.type}
                    {insp.scheduledAt
                      ? ` · ${formatDateTime(insp.scheduledAt)}`
                      : ''}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AgentShell>
  );
}
