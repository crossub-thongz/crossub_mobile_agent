'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { NeedActionTaskCard } from '@/components/agent/need-action-task-card';
import { PageIntro } from '@/components/agent/page-intro';
import { V2TasksPage } from '@/components/agent/tasks/v2-tasks-page';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import { formatPropertyFullAddress } from '@/lib/utils';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Leasing', label: 'Leasing' },
  { id: 'Maintenance', label: 'Maintenance' },
  { id: 'Inspection', label: 'Inspection' },
  { id: 'Accounting', label: 'Accounting' },
  { id: 'Tribunal', label: 'Tribunal' },
];

export default function TasksPage() {
  const isV2 = useIsAgentUiV2();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const propertyFilter = searchParams.get('property');
  const { needActionItems, properties } = useAgentData();
  const [filter, setFilter] = useState(
    urlFilter && CATEGORY_FILTERS.some((f) => f.id === urlFilter) ? urlFilter : 'all',
  );

  const filteredProperty = propertyFilter
    ? properties.find((p) => p.id === propertyFilter)
    : undefined;

  const list = useMemo(() => {
    let items = [...needActionItems];
    if (propertyFilter) {
      items = items.filter((item) => item.propertyId === propertyFilter);
    }
    if (filter === 'all') return items;
    return items.filter((i) => i.category === filter);
  }, [filter, needActionItems, propertyFilter]);

  const pageTitle = filteredProperty
    ? `${filteredProperty.address} — Need action`
    : 'Need Action';

  if (isV2) {
    return (
      <AgentShell title="Tasks" wide hideNeedAction>
        <V2TasksPage />
      </AgentShell>
    );
  }

  return (
    <AgentShell title={pageTitle} hideNeedAction>
      <div className="space-y-4">
        {filteredProperty ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" asChild>
              <Link href={ROUTES.TASKS}>
                <ChevronLeft className="size-4" />
                All properties
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href={propertyDetail(filteredProperty.id)}>
                View property
              </Link>
            </Button>
          </div>
        ) : null}

        <PageIntro
          description={
            filteredProperty
              ? `Items that need your decision or action for ${formatPropertyFullAddress(filteredProperty)}.`
              : 'Items that need your decision or action — sorted by urgency. Approve maintenance quotes inline where available.'
          }
        />

        <FilterChips options={CATEGORY_FILTERS} value={filter} onChange={setFilter} />

        {list.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description={
              filteredProperty
                ? 'Nothing needs your action for this property right now.'
                : 'Nothing needs your action right now.'
            }
          />
        ) : (
          <div className="space-y-2.5">
            {list.map((item) => (
              <NeedActionTaskCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
