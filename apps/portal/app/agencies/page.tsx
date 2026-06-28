'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { AgencyListCard } from '@/components/agent/agency-list-card';
import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { AGENCY_STATUS } from '@/constants/api-enums';
import { agencyDetail } from '@/constants/routes';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'inactive', label: 'Inactive' },
];

export default function AgenciesPage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const { agencies } = useAgentData();
  const [filter, setFilter] = useState(
    urlFilter && FILTERS.some((f) => f.id === urlFilter) ? urlFilter : 'all',
  );
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    let items = [...agencies];
    if (filter === 'active') items = items.filter((a) => a.status === AGENCY_STATUS.ACTIVE);
    if (filter === 'onboarding') {
      items = items.filter((a) => a.status === AGENCY_STATUS.ONBOARDING);
    }
    if (filter === 'inactive') items = items.filter((a) => a.status === AGENCY_STATUS.INACTIVE);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.company?.toLowerCase().includes(q) ?? false) ||
          (a.contactName?.toLowerCase().includes(q) ?? false),
      );
    }
    return items;
  }, [agencies, filter, search]);

  const totalProperties = agencies.reduce((sum, a) => sum + a.propertyCount, 0);

  return (
    <AgentShell title="Agencies">
      <div className="space-y-4">
        <PageIntro
          description={`${agencies.length} client ${
            agencies.length === 1 ? 'agency' : 'agencies'
          } · ${totalProperties} ${
            totalProperties === 1 ? 'property' : 'properties'
          } under management.`}
        />

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by agency or contact…"
            className="rounded-xl pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {list.length === 0 ? (
          <EmptyState
            title={search || filter !== 'all' ? 'No matching agencies' : 'No agencies yet'}
            description={
              search || filter !== 'all'
                ? 'Try a different search or filter.'
                : 'Client agencies you manage will appear here.'
            }
          />
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <AgencyListCard key={a.id} agency={a} href={agencyDetail(a.id)} />
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
