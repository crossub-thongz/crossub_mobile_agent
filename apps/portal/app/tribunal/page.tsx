'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gavel, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import { TribunalListTable } from '@/components/agent/portfolio-module-tables';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { tribunalDetail, ROUTES } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

export default function TribunalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const { tribunalCases } = useAgentData();
  const [filter, setFilter] = useState(() => {
    if (urlFilter === 'closed') return 'closed';
    if (urlFilter === 'all') return 'all';
    return 'active';
  });

  const list = useMemo(() => {
    if (filter === 'all') return tribunalCases;
    return tribunalCases.filter((c) => c.status === filter);
  }, [tribunalCases, filter]);

  return (
    <AgentShell title="Tribunal" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <PageIntro description="Review and approve tribunal matters proposed by CROSSUB, or add a new case." />

        <Button
          type="button"
          className="w-full rounded-xl"
          onClick={() =>
            toast.info('Add Tribunal Case — workflow to be confirmed with Leasing team')
          }
        >
          <Plus className="size-4" />
          Add tribunal case
        </Button>

        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {list.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="No tribunal cases"
            description="Active and closed QCAT matters will appear here."
          />
        ) : (
          <TribunalListTable
            items={list}
            onItemClick={(item) =>
              router.push(tribunalDetail(item.id, fromProperty(item.propertyId, 'Tribunal')))
            }
          />
        )}
      </div>
    </AgentShell>
  );
}
