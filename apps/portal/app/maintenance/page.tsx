'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';

import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBanner } from '@/components/agent/status-banner';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { maintenanceDetail } from '@/constants/routes';
import { formatCurrency } from '@/lib/utils';

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
    return items;
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

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by address or issue…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        <div className="space-y-2">
          {list.map((m) => (
            <Link
              key={m.id}
              href={maintenanceDetail(m.id)}
              className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-primary text-xs font-medium">{m.status}</p>
                  <p className="text-sm font-semibold">{m.title}</p>
                  <p className="text-muted-foreground text-xs">{m.propertyAddress}</p>
                  {m.quoteAmount != null && (
                    <p className="text-muted-foreground text-xs">
                      Quote {formatCurrency(m.quoteAmount)}
                      {m.requiresApproval ? ' · tap to approve' : ''}
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
