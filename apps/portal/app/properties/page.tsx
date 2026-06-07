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
  { id: 'active', label: 'Active' },
  { id: 'vacating', label: 'Vacating' },
  { id: 'vacant', label: 'Vacant' },
];

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const { properties, getPropertyActions } = useAgentData();
  const [filter, setFilter] = useState(
    urlFilter && ['active', 'vacating', 'vacant', 'periodic'].includes(urlFilter)
      ? urlFilter === 'active'
        ? 'active'
        : urlFilter
      : 'all',
  );
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    let items = [...properties];
    if (filter !== 'all') items = items.filter((p) => p.leaseStatus === filter);
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
  }, [properties, filter, search]);

  const needActionCount = properties.filter((p) => getPropertyActions(p.id).length > 0).length;

  return (
    <AgentShell title="Properties">
      <div className="space-y-4">
        <PageIntro description="Your assigned portfolio — properties needing action are highlighted." />

        {needActionCount > 0 && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm">
            <span className="font-semibold text-destructive">{needActionCount}</span>
            <span className="text-muted-foreground">
              {' '}
              propert{needActionCount === 1 ? 'y' : 'ies'} need your attention
            </span>
          </div>
        )}

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Address, landlord, tenant…"
            className="rounded-xl pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        <Button className="w-full rounded-xl" size="lg" asChild>
          <Link href={propertyNew()}>
            <Plus className="size-4" />
            Add property
          </Link>
        </Button>

        {list.length === 0 ? (
          <EmptyState
            title={search || filter !== 'all' ? 'No matching properties' : 'No properties yet'}
            description={
              search || filter !== 'all'
                ? 'Try a different search or filter.'
                : 'Add a property to start managing landlords and tenants.'
            }
            action={
              !search && filter === 'all' ? (
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
