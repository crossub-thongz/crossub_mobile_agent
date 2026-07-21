'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import { PropertyDiscardDraftDialog } from '@/components/agent/property-discard-draft-dialog';
import { PropertyEndManagementDialog } from '@/components/agent/property-end-management-dialog';
import { PropertyListView } from '@/components/agent/property-list-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { propertyDetail, propertyNew, propertyRegistryResume } from '@/constants/routes';
import { unreadMessagesForProperty } from '@/lib/communications-log';
import type { Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'occupied', label: 'Occupied' },
  { id: 'vacating', label: 'Vacating' },
  { id: 'vacant', label: 'Vacant' },
  { id: 'arrears', label: 'Arrears' },
  { id: 'archived', label: 'Archived' },
];

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const {
    properties,
    archivedProperties,
    agencies,
    getPropertyActions,
    accounting,
    hasFullManagementAccess,
    apiConnected,
    endPropertyManagement,
    deleteDraftProperty,
    refreshArchivedProperties,
    messages,
  } = useAgentData();
  const [filter, setFilter] = useState(
    urlFilter && FILTERS.some((f) => f.id === urlFilter) ? urlFilter : 'all',
  );
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null);
  const [endingManagement, setEndingManagement] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);

  const pendingDraftDelete = pendingDelete?.registryIntakeComplete === false;

  const isArchivedView = filter === 'archived';

  useEffect(() => {
    if (isArchivedView && apiConnected) {
      void refreshArchivedProperties();
    }
  }, [isArchivedView, apiConnected, refreshArchivedProperties]);

  const list = useMemo(() => {
    let items = isArchivedView ? [...archivedProperties] : [...properties];
    if (!isArchivedView && filter === 'occupied') {
      items = items.filter(
        (p) => p.leaseStatus === 'active' || p.leaseStatus === 'periodic',
      );
    }
    if (!isArchivedView && filter === 'vacating') {
      items = items.filter((p) => p.leaseStatus === 'vacating');
    }
    if (!isArchivedView && filter === 'vacant') {
      items = items.filter((p) => p.leaseStatus === 'vacant');
    }
    if (!isArchivedView && filter === 'arrears') {
      items = items.filter((p) => (accounting.find((a) => a.propertyId === p.id)?.arrearsAmount ?? 0) > 0);
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
  }, [properties, archivedProperties, filter, isArchivedView, search, accounting]);

  const needActionCount = properties.filter((p) => getPropertyActions(p.id).length > 0).length;

  const messageUnreadFor = useMemo(
    () => (property: Property) =>
      unreadMessagesForProperty(property.id, messages, formatPropertyFullAddress(property)),
    [messages],
  );

  const totalUnreadMessages = useMemo(
    () => list.reduce((sum, property) => sum + messageUnreadFor(property), 0),
    [list, messageUnreadFor],
  );

  const confirmDiscardDraft = async () => {
    if (!pendingDelete) return;
    setDiscardingDraft(true);
    try {
      await deleteDraftProperty(pendingDelete.id);
      toast.success('Draft property deleted');
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete draft property');
    } finally {
      setDiscardingDraft(false);
    }
  };

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
        <div className="flex items-start justify-between gap-3">
          <PageIntro
            description={
              isArchivedView
                ? 'Properties whose management has ended. These records are kept for reference.'
                : 'Your managed properties — like a phone book. Red circles show unread messages (WeChat-style).'
            }
          />
          {!isArchivedView && totalUnreadMessages > 0 ? (
            <span className="bg-[#fa5151] mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white tabular-nums">
              {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
            </span>
          ) : null}
        </div>

        {/* {needActionCount > 0 && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm">
            <span className="font-semibold text-destructive">{needActionCount}</span>
            <span className="text-muted-foreground">
              {' '}
              propert{needActionCount === 1 ? 'y' : 'ies'} need action
            </span>
          </div>
        )} */}

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

        {hasFullManagementAccess && !isArchivedView && (
          <Button className="w-full rounded-xl sm:w-auto" size="lg" asChild>
            <Link href={propertyNew()}>
              <Plus className="size-4" />
              Add property
            </Link>
          </Button>
        )}

        {list.length === 0 ? (
          <EmptyState
            title={
              search || filter !== 'all'
                ? isArchivedView
                  ? 'No matching archived properties'
                  : 'No matching properties'
                : isArchivedView
                  ? 'No archived properties'
                  : 'No properties yet'
            }
            description={
              search || filter !== 'all'
                ? 'Try a different search or filter.'
                : isArchivedView
                  ? 'Properties appear here after you end management on them.'
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
          <PropertyListView
            properties={list}
            agencies={agencies}
            variant={isArchivedView ? 'archived' : 'active'}
            actionCountFor={(id) => getPropertyActions(id).length}
            messageUnreadFor={messageUnreadFor}
            rowHref={(property) =>
              isArchivedView
                ? propertyDetail(property.id)
                : property.registryIntakeComplete === false
                  ? propertyRegistryResume(property.id)
                  : propertyDetail(property.id)
            }
            onDelete={setPendingDelete}
            canManage={hasFullManagementAccess && apiConnected && !isArchivedView}
          />
        )}
      </div>

      <PropertyDiscardDraftDialog
        property={pendingDraftDelete ? pendingDelete : null}
        open={pendingDelete != null && pendingDraftDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={confirmDiscardDraft}
        saving={discardingDraft}
      />

      <PropertyEndManagementDialog
        property={!pendingDraftDelete ? pendingDelete : null}
        open={pendingDelete != null && !pendingDraftDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={confirmEndManagement}
        saving={endingManagement}
      />
    </AgentShell>
  );
}
