'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';

import { FilterChips } from '@/components/agent/filter-chips';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { StatusBanner } from '@/components/agent/status-banner';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inspectionDetail, inspectionNew } from '@/constants/routes';
import { inspectionWorkflowProgress } from '@/lib/case-workflows';
import { OPEN_CONDUCTED_BY_LABEL } from '@/lib/open-inspection';
import { formatDateTime } from '@/lib/utils';

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'INGOING', label: 'Ingoing' },
  { id: 'OUTGOING', label: 'Outgoing' },
  { id: 'ROUTINE', label: 'Routine' },
];

export default function InspectionsPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const propertyParam = searchParams.get('property');
  const { inspections, properties, sectionStatus } = useAgentData();
  const [filter, setFilter] = useState(
    typeParam && TYPE_FILTERS.some((f) => f.id === typeParam) ? typeParam : 'all',
  );
  const [search, setSearch] = useState('');

  const summary = sectionStatus.find((s) => s.id === 'inspections');

  const list = useMemo(() => {
    let items = [...inspections];
    if (filter !== 'all') items = items.filter((i) => i.type === filter);
    if (propertyParam) items = items.filter((i) => i.propertyId === propertyParam);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) =>
        i.propertyAddress.toLowerCase().includes(q),
      );
    }
    return items.map((insp) => {
      const conductor =
        insp.type === 'OPEN' && insp.openConductedBy
          ? ` · ${OPEN_CONDUCTED_BY_LABEL[insp.openConductedBy]}`
          : '';
      return {
        id: insp.id,
        propertyAddress: insp.propertyAddress,
        taskLabel: `${insp.type} inspection${conductor}${insp.scheduledAt ? ` · ${formatDateTime(insp.scheduledAt)}` : ''}`,
        status: inspectionWorkflowProgress(insp).currentStepLabel,
        href: inspectionDetail(insp.id),
        module: 'Inspection',
        tone: ['Scheduled', 'Confirmed', 'In Progress', 'Agent scheduled', 'Requested — CROSSUB scheduling', 'Awaiting tenant notice'].includes(insp.status)
          ? ('neutral' as const)
          : ('ok' as const),
      };
    });
  }, [inspections, filter, search, propertyParam]);

  const propertyLabel = propertyParam
    ? properties.find((p) => p.id === propertyParam)
    : undefined;

  return (
    <AgentShell title="Inspections">
      <div className="space-y-4">
        <StatusBanner
          status={summary?.statusLabel ?? 'Nothing scheduled'}
          tone="default"
        />

        {propertyLabel && (
          <p className="text-muted-foreground text-xs">
            Filtered to {propertyLabel.address}, {propertyLabel.suburb}
          </p>
        )}

        <Button asChild className="w-full">
          <Link href={inspectionNew(propertyParam ?? undefined)}>
            <Plus className="size-4" />
            Add open inspection
          </Link>
        </Button>

        <Input
          placeholder="Search by address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterChips options={TYPE_FILTERS} value={filter} onChange={setFilter} />

        <div className="space-y-2">
          {list.map((item) => (
            <TaskStatusRow key={item.id} item={item} />
          ))}
        </div>
        <ModuleCommunications
          categories={['Inspection']}
          title="Inspection emails & messages"
          emptyHint="Inspection-related emails and messages across your portfolio appear here."
        />
      </div>
    </AgentShell>
  );
}
