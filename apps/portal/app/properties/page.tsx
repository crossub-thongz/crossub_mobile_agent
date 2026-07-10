'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import { PropertyEndManagementDialog } from '@/components/agent/property-end-management-dialog';
import { PropertyListTable } from '@/components/agent/property-list-table';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { propertyDetail, propertyNew } from '@/constants/routes';
import type { Property } from '@/lib/types';

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
  const {
    properties,
    agencies,
    getPropertyActions,
    accounting,
    tribunalCases,
    hasFullManagementAccess,
    apiConnected,
    endPropertyManagement,
  } = useAgentData();
  const [filter, setFilter] = useState(
    urlFilter && FILTERS.some((f) => f.id === urlFilter) ? urlFilter : 'all',
  );
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null);
  const [endingManagement, setEndingManagement] = useState(false);

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
          p.suburb.toLowerCase().includes(q) ||
          p.tenantName.toLowerCase().includes(q) ||
          p.homeOwnerName.toLowerCase().includes(q) ||
          (p.agencyName?.toLowerCase().includes(q) ?? false) ||
          (p.propertyManager?.toLowerCase().includes(q) ?? false),
      );
    }
    return items;
  }, [properties, filter, search, accounting, getPropertyActions, tribunalCases]);

  const needActionCount = properties.filter((p) => getPropertyActions(p.id).length > 0).length;

  const confirmEndManagement = async (endOfManagementDate: string) => {
    if (!pendingDelete) return;
    setEndingManagement(true);
    try {
      await endPropertyManagement(pendingDelete.id, endOfManagementDate);
      toast.success('Property management ended');
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not end property management');
    } finally {
      setEndingManagement(false);
    }
  };

  return (
    <AgentShell title="Properties">
      <div className="space-y-4">
        <PageIntro description="Table view of your managed properties. Rows needing action are highlighted." />

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
            placeholder="Search address, tenant, agency, PM…"
            className="rounded-xl pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {hasFullManagementAccess && (
          <Button className="w-full rounded-xl sm:w-auto" size="lg" asChild>
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
          <PropertyListTable
            properties={list}
            agencies={agencies}
            actionCountFor={(id) => getPropertyActions(id).length}
            detailHref={propertyDetail}
            onDelete={setPendingDelete}
            canManage={hasFullManagementAccess && apiConnected}
          />
        )}
      </div>

      <PropertyEndManagementDialog
        property={pendingDelete}
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={confirmEndManagement}
        saving={endingManagement}
      />
    </AgentShell>
  );
}
