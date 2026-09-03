'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, Map as MapIcon, Search } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { PropertiesPageHeaderActions } from '@/components/agent/properties/properties-page-header-actions';
import { PropertyListV2Map } from '@/components/agent/properties/property-list-v2-map';
import { PropertyListV2Table } from '@/components/agent/properties/property-list-v2-table';
import { PropertyRemoveDialog } from '@/components/agent/property-remove-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { propertyDetail, propertyNew, propertyRegistryResume } from '@/constants/routes';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  filterPropertiesForListV2,
  PROPERTY_LIST_V2_FILTERS,
  PROPERTY_LIST_V2_SORTS,
  sortPropertiesForListV2,
  type PropertyListV2Filter,
  type PropertyListV2Sort,
} from '@/lib/property-list-v2';
import { isPropertyRegistryDraft } from '@/lib/property-registry-persist';
import { useShellAsideStore } from '@/lib/shell-aside-store';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import '@/components/agent/properties/property-list-v2.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function V2PropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const {
    properties,
    archivedProperties,
    accounting,
    leasingRecords,
    getPropertyActions,
    apiConnected,
    deleteDraftProperty,
    endPropertyManagement,
    archiveProperty,
    restoreProperty,
    refreshArchivedProperties,
    hasFullManagementAccess,
  } = useAgentData();
  const setPropertiesPageActive = useShellAsideStore((s) => s.setPropertiesPageActive);
  const selectedId = useShellAsideStore((s) => s.propertyPreviewId);
  const setSelectedId = useShellAsideStore((s) => s.setPropertyPreviewId);

  const [filter, setFilter] = useState<PropertyListV2Filter>(() =>
    urlFilter && PROPERTY_LIST_V2_FILTERS.some((option) => option.id === urlFilter)
      ? (urlFilter as PropertyListV2Filter)
      : 'all',
  );
  const [sort, setSort] = useState<PropertyListV2Sort>('newest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [desktopViewport, setDesktopViewport] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null);
  const [removing, setRemoving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const initialSelectDone = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktopViewport(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const handlePropertyOpen = useCallback(
    (propertyId: string) => {
      const property =
        properties.find((row) => row.id === propertyId) ??
        archivedProperties.find((row) => row.id === propertyId);
      if (property && isPropertyRegistryDraft(property)) {
        router.push(propertyRegistryResume(propertyId));
        return;
      }
      router.push(propertyDetail(propertyId));
    },
    [archivedProperties, properties, router],
  );

  const handlePropertySelect = useCallback(
    (propertyId: string) => {
      const property =
        properties.find((row) => row.id === propertyId) ??
        archivedProperties.find((row) => row.id === propertyId);
      if (property && isPropertyRegistryDraft(property)) {
        router.push(propertyRegistryResume(propertyId));
        return;
      }
      if (!desktopViewport) {
        router.push(propertyDetail(propertyId));
        return;
      }
      setSelectedId(propertyId);
      initialSelectDone.current = true;
    },
    [archivedProperties, desktopViewport, properties, router, setSelectedId],
  );

  const confirmDeletePermanently = useCallback(async () => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await deleteDraftProperty(pendingDelete.id);
      if (selectedId === pendingDelete.id) setSelectedId(null);
      toast.success('Property deleted permanently');
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete property');
    } finally {
      setRemoving(false);
    }
  }, [deleteDraftProperty, pendingDelete, selectedId, setSelectedId]);

  const confirmEndManagement = useCallback(
    async (endOfManagementDate: string) => {
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
    },
    [endPropertyManagement, pendingDelete],
  );

  const confirmArchive = useCallback(async () => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await archiveProperty(pendingDelete.id);
      if (selectedId === pendingDelete.id) setSelectedId(null);
      toast.success('Property archived — check it in the History page');
      setPendingDelete(null);
      setFilter('archived');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive property');
    } finally {
      setRemoving(false);
    }
  }, [archiveProperty, pendingDelete, selectedId, setSelectedId]);

  const handleRestore = useCallback(
    async (property: Property) => {
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
    },
    [apiConnected, restoreProperty],
  );

  useEffect(() => {
    if (apiConnected) {
      void refreshArchivedProperties();
    }
  }, [apiConnected, refreshArchivedProperties]);

  useEffect(() => {
    setPropertiesPageActive(true);
    return () => setPropertiesPageActive(false);
  }, [setPropertiesPageActive]);

  const needActionCountFor = useMemo(
    () => (propertyId: string) => getPropertyActions(propertyId).length,
    [getPropertyActions],
  );

  const isArchivedView = filter === 'archived';

  const filtered = useMemo(() => {
    let rows =
      filter === 'archived'
        ? [...archivedProperties]
        : filterPropertiesForListV2(
            properties,
            filter,
            accounting,
            needActionCountFor,
          );
    if (search.trim()) {
      const query = search.toLowerCase();
      rows = rows.filter(
        (property) =>
          property.address.toLowerCase().includes(query) ||
          property.suburb.toLowerCase().includes(query) ||
          property.tenantName.toLowerCase().includes(query) ||
          (property.additionalTenants ?? []).some((tenant) =>
            tenant.name.toLowerCase().includes(query),
          ) ||
          property.homeOwnerName.toLowerCase().includes(query) ||
          (property.agencyName?.toLowerCase().includes(query) ?? false) ||
          (property.propertyManager?.toLowerCase().includes(query) ?? false),
      );
    }
    return sortPropertiesForListV2(rows, sort);
  }, [
    accounting,
    archivedProperties,
    filter,
    needActionCountFor,
    properties,
    search,
    sort,
  ]);

  const filterCounts = useMemo(() => {
    const counts: Record<PropertyListV2Filter, number> = {
      all: properties.length,
      occupied: filterPropertiesForListV2(
        properties,
        'occupied',
        accounting,
        needActionCountFor,
      ).length,
      vacant: filterPropertiesForListV2(properties, 'vacant', accounting, needActionCountFor)
        .length,
      arrears: filterPropertiesForListV2(properties, 'arrears', accounting, needActionCountFor)
        .length,
      needs_attention: filterPropertiesForListV2(
        properties,
        'needs_attention',
        accounting,
        needActionCountFor,
      ).length,
      archived: archivedProperties.length,
    };
    return counts;
  }, [accounting, archivedProperties.length, needActionCountFor, properties]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, search, sort, pageSize]);

  useEffect(() => {
    if (!hasFullManagementAccess && filter === 'arrears') setFilter('all');
  }, [filter, hasFullManagementAccess]);

  useEffect(() => {
    if (!desktopViewport) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    const previewable = filtered.filter((property) => !isPropertyRegistryDraft(property));
    if (previewable.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (selectedId && !previewable.some((property) => property.id === selectedId)) {
      setSelectedId(previewable[0]!.id);
      return;
    }
    if (!selectedId && !initialSelectDone.current) {
      setSelectedId(previewable[0]!.id);
      initialSelectDone.current = true;
    }
  }, [desktopViewport, filtered, selectedId, setSelectedId]);

  const pageEnd = Math.min(pageStart + pageRows.length, filtered.length);

  const listFilters = useMemo(
    () =>
      PROPERTY_LIST_V2_FILTERS.filter(
        (option) => option.id !== 'arrears' || hasFullManagementAccess,
      ),
    [hasFullManagementAccess],
  );

  return (
    <div className="property-list-v2 normal-case flex flex-col gap-4 px-4 py-4 lg:px-6 lg:py-5">
      <PropertiesPageHeaderActions className="flex flex-wrap gap-2 lg:hidden" />

      <div className="relative shrink-0">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search address, tenant, owner…"
          className="rounded-xl pl-10"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div
        id="property-list-v2-filters"
        className="flex shrink-0 flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap gap-2">
          {listFilters.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === option.id
                  ? 'border-primary/30 bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:border-primary/20 hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {option.label} {filterCounts[option.id]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as PropertyListV2Sort)}
              className="border-input bg-background rounded-lg border px-2 py-1.5 text-xs font-semibold"
            >
              {PROPERTY_LIST_V2_SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                viewMode === 'list'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <List className="size-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                viewMode === 'map'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <MapIcon className="size-3.5" />
              Map
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
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
      ) : viewMode === 'map' ? (
        <PropertyListV2Map
          properties={filtered}
          selectedId={selectedId}
          onSelect={handlePropertySelect}
        />
      ) : (
        <>
          <PropertyListV2Table
            properties={pageRows}
            selectedId={selectedId}
            accounting={accounting}
            leasingRecords={leasingRecords}
            needActionCountFor={needActionCountFor}
            onSelect={handlePropertySelect}
            onOpenProfile={handlePropertyOpen}
            onDeleteDraft={apiConnected && !isArchivedView ? setPendingDelete : undefined}
            onArchive={apiConnected && !isArchivedView ? setPendingDelete : undefined}
            onRestore={
              apiConnected && isArchivedView
                ? (property) => void handleRestore(property)
                : undefined
            }
            restoringId={restoringId}
          />

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
            <p className="text-muted-foreground text-xs">
              Showing {pageStart + 1} to {pageEnd} of {filtered.length} properties
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={cn(
                        'size-8 rounded-lg text-xs font-semibold tabular-nums',
                        currentPage === pageNumber
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className="rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
              <label className="text-muted-foreground flex items-center gap-2 text-xs">
                Rows per page
                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                  }
                  className="border-input bg-background rounded-lg border px-2 py-1 text-xs font-medium"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </>
      )}

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
    </div>
  );
}
