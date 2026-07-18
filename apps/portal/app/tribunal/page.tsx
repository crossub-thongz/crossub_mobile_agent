'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Gavel, Plus } from 'lucide-react';

import { CreateTribunalRentChasingDialog } from '@/components/agent/create-tribunal-rent-chasing-dialog';
import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import { TribunalListTable } from '@/components/agent/portfolio-module-tables';
import { TribunalCaseDetailDialog } from '@/components/agent/tribunal-case-detail-dialog';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

export default function TribunalPage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const { tribunalCases, properties, refresh } = useAgentData();
  const [filter, setFilter] = useState(() => {
    if (urlFilter === 'closed') return 'closed';
    if (urlFilter === 'all') return 'all';
    return 'active';
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const list = useMemo(() => {
    if (filter === 'all') return tribunalCases;
    return tribunalCases.filter((c) => c.status === filter);
  }, [tribunalCases, filter]);

  const selectedCase =
    tribunalCases.find((row) => row.id === selectedCaseId) ?? null;

  return (
    <AgentShell title="Tribunal" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <PageIntro description="Review and approve tribunal matters proposed by CROSSUB, or add a new case." />

        <Button
          type="button"
          className="w-full rounded-xl"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Add tribunal case
        </Button>

        <CreateTribunalRentChasingDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          properties={properties}
          onCreated={async (caseId) => {
            await refresh();
            setSelectedCaseId(caseId);
          }}
        />

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
            selectedId={selectedCaseId}
            onItemClick={(item) => setSelectedCaseId(item.id)}
          />
        )}

        <TribunalCaseDetailDialog
          open={selectedCaseId != null}
          onClose={() => setSelectedCaseId(null)}
          caseId={selectedCaseId}
          tribunalCase={selectedCase}
          onDeleted={async () => {
            setSelectedCaseId(null);
            await refresh();
          }}
        />
      </div>
    </AgentShell>
  );
}
