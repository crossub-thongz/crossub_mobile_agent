'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PropertyRemoveDialog } from '@/components/agent/property-remove-dialog';
import { PropertyListView } from '@/components/agent/property-list-view';
import { V2PropertiesPage } from '@/components/agent/properties/v2-properties-page';
import { PropertiesPageHeaderActions } from '@/components/agent/properties/properties-page-header-actions';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { Input } from '@/components/ui/input';
import { propertyDetail, propertyHref, propertyNew } from '@/constants/routes';
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
  const isV2 = useIsAgentUiV2();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const {
    properties,
    archivedProperties,
    agencies,
    accounting,
    apiConnected,
    endPropertyManagement,
    archiveProperty,
    restoreProperty,
    deleteDraftProperty,
    refreshArchivedProperties,
    messages,
    getPropertyActions,
  } = useAgentData();
  const [filter, setFilter] = useState(
    urlFilter && FILTERS.some((f) => f.id === urlFilter) ? urlFilter : 'all',
  );
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null);
  const [removing, setRemoving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const isArchivedView = filter === 'archived';

  useEffect(() => {
    if (apiConnected) {
      void refreshArchivedProperties();
    }
  }, [apiConnected, refreshArchivedProperties]);

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

  const messageUnreadFor = useMemo(
    () => (property: Property) =>
      unreadMessagesForProperty(property.id, messages, formatPropertyFullAddress(property)),
    [messages],
  );

  const needActionCountFor = useMemo(
    () => (property: Property) => getPropertyActions(property.id).length,
    [getPropertyActions],
  );

  const confirmDeletePermanently = async () => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await deleteDraftProperty(pendingDelete.id);
      toast.success('Property deleted permanently');
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete property');
    } finally {
      setRemoving(false);
    }
  };

  const confirmEndManagement = async (endOfManagementDate: string) => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await endPropertyManagement(pendingDelete.id, endOfManagementDate);
      toast.success('End of management date recorded — property stays on your portfolio');
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not end property management');
    } finally {
      setRemoving(false);
    }
  };

  const confirmArchive = async () => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await archiveProperty(pendingDelete.id);
      toast.success('Property archived — open the Archived filter to view it');
      setPendingDelete(null);
      setFilter('archived');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive property');
    } finally {
      setRemoving(false);
    }
  };

  const handleRestore = async (property: Property) => {
    if (!apiConnected) {
      toast.error('Connect to the API to restore this property');
      return;
    }
    setRestoringId(property.id);
    try {
      await restoreProperty(property.id);
      toast.success('Property restored to your live list');
      setFilter('all');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not restore property');
    } finally {
      setRestoringId(null);
    }
  };

  if (isV2) {
    return (
      <AgentShell
        title="Properties"
        wide
        headerActions={<PropertiesPageHeaderActions className="flex flex-wrap gap-2" />}
      >
        <V2PropertiesPage />
      </AgentShell>
    );
  }

  return (
    <AgentShell title="Properties">
      <div className="space-y-4">
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

        {!isArchivedView && (
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
                  ? 'Properties appear here after you archive them. Permanently deleted properties are removed entirely and will not show here.'
                  : 'Add a property to start managing landlords and tenants.'
            }
            action={
              !search && filter === 'all' && !isArchivedView ? (
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
            messageUnreadFor={messageUnreadFor}
            needActionCountFor={needActionCountFor}
            rowHref={(property) =>
              isArchivedView ? propertyDetail(property.id) : propertyHref(property)
            }
            onDelete={setPendingDelete}
            onRestore={
              isArchivedView ? (property) => void handleRestore(property) : undefined
            }
            restoringId={restoringId}
            canManage={apiConnected && !isArchivedView}
          />
        )}
      </div>

      <PropertyRemoveDialog
        property={pendingDelete}
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onEndManagement={confirmEndManagement}
        onArchive={confirmArchive}
        onDeletePermanently={confirmDeletePermanently}
        saving={removing}
      />
    </AgentShell>
  );
}
