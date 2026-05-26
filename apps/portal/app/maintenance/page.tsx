'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2, Search } from 'lucide-react';

import { DataSourceBadge } from '@/components/agent/data-source-badge';
import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { maintenanceDetail } from '@/constants/routes';
import { formatCurrency } from '@/lib/utils';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'approval', label: 'Approval' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'in_progress', label: 'In progress' },
];

export default function MaintenancePage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { maintenanceAll, loading, apiConnected } = useAgentData();

  const list = useMemo(() => {
    let items = [...maintenanceAll];
    if (filter === 'approval')
      items = items.filter((m) => m.requiresApproval);
    if (filter === 'urgent') items = items.filter((m) => m.priority === 'urgent');
    if (filter === 'in_progress')
      items = items.filter((m) =>
        m.status.toLowerCase().includes('progress'),
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.propertyAddress.toLowerCase().includes(q) ||
          m.trackingNumber.toLowerCase().includes(q),
      );
    }
    return items;
  }, [maintenanceAll, filter, search]);

  return (
    <AgentShell title="Maintenance">
      <div className="space-y-4">
        <DataSourceBadge source={apiConnected ? 'api' : 'demo'} />
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search maintenance…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Syncing with crossub_web…
          </div>
        )}
        <div className="space-y-2">
          {list.map((m) => (
            <Link
              key={m.id}
              href={maintenanceDetail(m.id)}
              className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DataSourceBadge source={m.source} />
                    {m.requiresApproval && (
                      <StatusBadge label="Approval" variant="approval" />
                    )}
                    {m.priority === 'urgent' && (
                      <StatusBadge label="Urgent" priority="urgent" />
                    )}
                    <StatusBadge label={m.status} />
                  </div>
                  <p className="text-sm font-semibold">{m.title}</p>
                  <p className="text-muted-foreground text-xs">{m.propertyAddress}</p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {m.responsibility} responsibility
                    {m.quoteAmount != null &&
                      ` · ${formatCurrency(m.quoteAmount)} quote`}
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
