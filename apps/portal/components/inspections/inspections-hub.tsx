'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardList, DoorOpen, Plus } from 'lucide-react';

import { CreateInspectionWizard } from '@/components/inspections/create-inspection-wizard';
import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { InspectionsListTable } from '@/components/agent/portfolio-module-tables';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
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
  const [createOpen, setCreateOpen] = useState(false);

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
    return items;
  }, [inspections, propertyFilterId, typeFilter, statusFilter, search]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryTile label="Open active" value={counts.open} icon={DoorOpen} highlight={counts.open > 0} />
        <SummaryTile label="Needs attention" value={counts.action} highlight={counts.action > 0} />
        <SummaryTile label="Upcoming" value={counts.upcoming} />
        <SummaryTile label="Completed" value={counts.done} />
      </div>

      <Button
        type="button"
        size="lg"
        className="h-11 w-full rounded-xl"
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="size-4" />
        Add inspection
      </Button>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add inspection</DialogTitle>
            <DialogDescription>
              Choose a type and property — fields autofill from your portfolio like property workflow
              cases.
            </DialogDescription>
          </DialogHeader>
          <CreateInspectionWizard
            preselectedPropertyId={propertyFilterId}
            onCreated={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                Add inspection
              </Button>
            ) : undefined
          }
        />
      ) : (
        <InspectionsListTable items={filtered} />
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
