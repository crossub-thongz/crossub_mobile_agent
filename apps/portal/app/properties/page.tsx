'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import { PropertyListCard } from '@/components/agent/property-list-card';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { propertyDetail, propertyNew } from '@/constants/routes';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'occupied', label: 'Occupied' },
  { id: 'vacant', label: 'Vacant' },
  { id: 'arrears', label: 'Arrears' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'tribunal', label: 'Tribunal' },
];

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const { properties, getPropertyActions, accounting, tribunalCases, hasFullManagementAccess } =
    useAgentData();
  const [filter, setFilter] = useState(
    urlFilter && FILTERS.some((f) => f.id === urlFilter) ? urlFilter : 'all',
  );
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    let items = [...properties];
    if (filter === 'occupied') {
      items = items.filter(
        (p) =>
          p.leaseStatus === 'active' ||
          p.leaseStatus === 'periodic' ||
          p.leaseStatus === 'vacating',
      );
    }
    if (filter === 'vacant') items = items.filter((p) => p.leaseStatus === 'vacant');
    if (filter === 'arrears') {
      items = items.filter((p) => (accounting.find((a) => a.propertyId === p.id)?.arrearsAmount ?? 0) > 0);
    }
    if (filter === 'maintenance') {
      items = items.filter((p) =>
        getPropertyActions(p.id).some((a) => a.category === 'Maintenance'),
      );
    }
    if (filter === 'tribunal') {
      items = items.filter((p) =>
        tribunalCases.some((t) => t.propertyId === p.id && t.status === 'active'),
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.address.toLowerCase().includes(q) ||
          p.tenantName.toLowerCase().includes(q) ||
          p.homeOwnerName.toLowerCase().includes(q),
      );
    }
    return items;
  }, [properties, filter, search, accounting, getPropertyActions, tribunalCases]);

  const needActionCount = properties.filter((p) => getPropertyActions(p.id).length > 0).length;

  return (
    <AgentShell title="Properties">
      <div className="space-y-4">
        <PageIntro description="List view — properties needing action are highlighted." />

        {needActionCount > 0 && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm">
            <span className="font-semibold text-destructive">{needActionCount}</span>
            <span className="text-muted-foreground">
              {' '}
              propert{needActionCount === 1 ? 'y' : 'ies'} need action
            </span>
          </div>
        )}

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by address…"
            className="rounded-xl pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {hasFullManagementAccess && (
          <Button className="w-full rounded-xl" size="lg" asChild>
            <Link href={propertyNew()}>
              <Plus className="size-4" />
              Add property
            </Link>
          </Button>
        )}

        {list.length === 0 ? (
          <EmptyState
            title={search || filter !== 'all' ? 'No matching properties' : 'No properties yet'}
            description={
              search || filter !== 'all'
                ? 'Try a different search or filter.'
                : 'Add a property to start managing landlords and tenants.'
            }
            action={
              hasFullManagementAccess && !search && filter === 'all' ? (
                <Button size="sm" asChild>
                  <Link href={propertyNew()}>Add property</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {list.map((p) => (
              <PropertyListCard
                key={p.id}
                property={p}
                actionCount={getPropertyActions(p.id).length}
                href={propertyDetail(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
