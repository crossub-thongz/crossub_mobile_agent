'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';

import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { propertyDetail } from '@/constants/routes';
import { formatCurrency } from '@/lib/utils';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'vacating', label: 'Vacating' },
  { id: 'vacant', label: 'Vacant' },
];

export default function PropertiesPage() {
  const { properties } = useAgentData();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    let items = [...properties];
    if (filter !== 'all')
      items = items.filter((p) => p.leaseStatus === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.address.toLowerCase().includes(q) ||
          p.suburb.toLowerCase().includes(q) ||
          p.tenantName.toLowerCase().includes(q),
      );
    }
    return items;
  }, [properties, filter, search]);

  return (
    <AgentShell title="Properties">
      <div className="space-y-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Address, suburb, tenant…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
        <div className="space-y-2">
          {list.map((p) => (
            <Link
              key={p.id}
              href={propertyDetail(p.id)}
              className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold">{p.address}</p>
                  <p className="text-muted-foreground text-xs">{p.suburb}</p>
                  <p className="text-sm">{p.tenantName}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <StatusBadge label={p.leaseStatus} />
                    {p.openTasks > 0 && (
                      <StatusBadge label={`${p.openTasks} open tasks`} variant="approval" />
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {p.rentWeekly > 0 && (
                    <span className="text-sm font-medium">
                      {formatCurrency(p.rentWeekly)}/wk
                    </span>
                  )}
                  <ChevronRight className="text-muted-foreground size-4" />
                </div>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {p.inspectionStatus} · {p.maintenanceStatus}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </AgentShell>
  );
}
