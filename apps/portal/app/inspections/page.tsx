'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';

import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { inspectionDetail } from '@/constants/routes';
import { formatDateTime } from '@/lib/utils';

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'INGOING', label: 'Ingoing' },
  { id: 'OUTGOING', label: 'Outgoing' },
  { id: 'ROUTINE', label: 'Routine' },
  { id: 'OPEN', label: 'Open' },
];

export default function InspectionsPage() {
  const { inspections } = useAgentData();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    let items = [...inspections];
    if (filter !== 'all') items = items.filter((i) => i.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.propertyAddress.toLowerCase().includes(q) ||
          i.trackingNumber.toLowerCase().includes(q),
      );
    }
    return items;
  }, [inspections, filter, search]);

  return (
    <AgentShell title="Inspections">
      <div className="space-y-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Tracking #, address…"
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
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge label={insp.type} variant="approval" />
                    <StatusBadge label={insp.status} />
                  </div>
                  <p className="text-sm font-medium">{insp.propertyAddress}</p>
                  <p className="text-muted-foreground text-xs">
                    {insp.trackingNumber}
                    {insp.inspector ? ` · ${insp.inspector}` : ''}
                  </p>
                  {insp.scheduledAt && (
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(insp.scheduledAt)}
                    </p>
                  )}
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
