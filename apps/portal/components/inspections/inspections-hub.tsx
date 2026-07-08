'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardList, DoorOpen, Plus } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { InspectionGroupSection, InspectionJobCard } from '@/components/inspections/inspection-job-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inspectionNew } from '@/constants/routes';
import {
  groupInspection,
  INSPECTION_GROUP_LABEL,
  inspectionSummaryCounts,
  isInspectionDone,
} from '@/lib/inspections/presentation';
import type { Inspection } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'OPEN', label: 'Open' },
  { id: 'INGOING', label: 'Ingoing' },
  { id: 'OUTGOING', label: 'Outgoing' },
  { id: 'ROUTINE', label: 'Routine' },
] as const;

const STATUS_FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number]['id'];
type StatusFilter = (typeof STATUS_FILTERS)[number]['id'];

function sortInspections(items: Inspection[]): Inspection[] {
  return [...items].sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    if (aTime && bTime) return bTime - aTime;
    if (aTime) return -1;
    if (bTime) return 1;
    return b.propertyAddress.localeCompare(a.propertyAddress);
  });
}

export function InspectionsHub({
  inspections,
  propertyFilterId,
  propertyLabel,
}: {
  inspections: Inspection[];
  propertyFilterId?: string | null;
  propertyLabel?: string;
}) {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    typeParam && TYPE_FILTERS.some((f) => f.id === typeParam) ? (typeParam as TypeFilter) : 'all',
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => inspectionSummaryCounts(inspections), [inspections]);

  const filtered = useMemo(() => {
    let items = [...inspections];
    if (propertyFilterId) items = items.filter((i) => i.propertyId === propertyFilterId);
    if (typeFilter !== 'all') items = items.filter((i) => i.type === typeFilter);
    if (statusFilter === 'active') items = items.filter((i) => !isInspectionDone(i));
    if (statusFilter === 'done') items = items.filter((i) => isInspectionDone(i));
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.propertyAddress.toLowerCase().includes(q) ||
          i.trackingNumber.toLowerCase().includes(q) ||
          i.status.toLowerCase().includes(q),
      );
    }
    return sortInspections(items);
  }, [inspections, propertyFilterId, typeFilter, statusFilter, search]);

  const grouped = useMemo(() => {
    const action: Inspection[] = [];
    const upcoming: Inspection[] = [];
    const done: Inspection[] = [];
    for (const item of filtered) {
      const bucket = groupInspection(item);
      if (bucket === 'action') action.push(item);
      else if (bucket === 'done') done.push(item);
      else upcoming.push(item);
    }
    return { action, upcoming, done };
  }, [filtered]);

  const showGrouped = statusFilter !== 'done';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryTile label="Open active" value={counts.open} icon={DoorOpen} highlight={counts.open > 0} />
        <SummaryTile label="Needs attention" value={counts.action} highlight={counts.action > 0} />
        <SummaryTile label="Upcoming" value={counts.upcoming} />
        <SummaryTile label="Completed" value={counts.done} />
      </div>

      <Button asChild size="lg" className="h-11 w-full rounded-xl">
        <Link href={inspectionNew(propertyFilterId ?? undefined)}>
          <Plus className="size-4" />
          Add inspection
        </Link>
      </Button>

      {propertyLabel && (
        <p className="text-muted-foreground text-xs">
          Showing inspections for <span className="text-foreground font-medium">{propertyLabel}</span>
        </p>
      )}

      <div className="space-y-3">
        <Input
          placeholder="Search address or job ref…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10"
        />
        <FilterChips options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        <FilterChips options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No inspections match"
          description={
            statusFilter === 'active'
              ? 'Active inspection jobs will appear here. Add an inspection to get started.'
              : 'Try changing your filters or search.'
          }
          action={
            statusFilter === 'active' ? (
              <Button asChild variant="outline" size="sm">
                <Link href={inspectionNew(propertyFilterId ?? undefined)}>Add inspection</Link>
              </Button>
            ) : undefined
          }
        />
      ) : showGrouped ? (
        <div className="space-y-5">
          <InspectionGroupSection
            group="action"
            label={INSPECTION_GROUP_LABEL.action}
            inspections={grouped.action}
          />
          <InspectionGroupSection
            group="upcoming"
            label={INSPECTION_GROUP_LABEL.upcoming}
            inspections={grouped.upcoming}
          />
          {statusFilter === 'all' && (
            <InspectionGroupSection
              group="done"
              label={INSPECTION_GROUP_LABEL.done}
              inspections={grouped.done}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inspection) => (
            <InspectionJobCard key={inspection.id} inspection={inspection} />
          ))}
        </div>
      )}

      <ModuleCommunications
        categories={['Inspection']}
        title="Inspection messages"
        emptyHint="Emails and messages about inspections across your portfolio."
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: number;
  icon?: typeof DoorOpen;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card px-3 py-3',
        highlight && 'border-primary/30 bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">{label}</p>
        {Icon && <Icon className={cn('size-3.5', highlight ? 'text-primary' : 'text-muted-foreground')} />}
      </div>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', highlight && 'text-primary')}>{value}</p>
    </div>
  );
}
