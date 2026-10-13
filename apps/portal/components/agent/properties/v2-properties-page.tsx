'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, Map as MapIcon, Search, SlidersHorizontal } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { PropertiesPageHeaderActions } from '@/components/agent/properties/properties-page-header-actions';
import { PropertyListV2Map } from '@/components/agent/properties/property-list-v2-map';
import { PropertyListV2Table } from '@/components/agent/properties/property-list-v2-table';
import { PropertyRemoveDialog } from '@/components/agent/property-remove-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { propertyDetail, propertyNew, propertyRegistryResume } from '@/constants/routes';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  filterPropertiesForListV2,
  PROPERTY_LEASE_WINDOWS,
  PROPERTY_LIST_V2_SORTS,
  propertyInLeaseView,
  sortPropertiesForListV2,
  type PropertyDirectoryTab,
  type PropertyLeaseView,
  type PropertyLeaseWindow,
  type PropertyListV2Sort,
  type PropertyOccupancyFilter,
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

  const [directory, setDirectory] = useState<PropertyDirectoryTab>(
    urlFilter === 'arrears' ? 'arrears' : 'all',
  );
  const [leaseView, setLeaseView] = useState<PropertyLeaseView>('expiring');
  const [leaseWindow, setLeaseWindow] = useState<PropertyLeaseWindow>(60);
  const [occupancy, setOccupancy] = useState<PropertyOccupancyFilter>(
    urlFilter === 'occupied' || urlFilter === 'vacant' ? urlFilter : 'all',
  );
  const [needsAttention, setNeedsAttention] = useState(urlFilter === 'needs_attention');
  const [archived, setArchived] = useState(urlFilter === 'archived');
  const [sort, setSort] = useState<PropertyListV2Sort>(urlFilter === 'arrears' ? 'arrears' : 'newest');
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
      setArchived(true);
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
        setArchived(false);
        setDirectory('all');
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

  const isArchivedView = archived;

  const currentLeaseFor = useCallback(
    (propertyId: string) =>
      leasingRecords.find((row) => row.propertyId === propertyId && row.status === 'current'),
    [leasingRecords],
  );

  const scoped = useMemo(() => {
    let rows = archived ? [...archivedProperties] : [...properties];
    if (occupancy !== 'all') {
      rows = filterPropertiesForListV2(rows, occupancy, accounting, needActionCountFor);
    }
    if (needsAttention) {
      rows = filterPropertiesForListV2(rows, 'needs_attention', accounting, needActionCountFor);
    }
    return rows;
  }, [accounting, archived, archivedProperties, needActionCountFor, occupancy, needsAttention, properties]);

  const directoryCounts = useMemo(
    () => ({
      all: scoped.length,
      arrears: filterPropertiesForListV2(scoped, 'arrears', accounting, needActionCountFor).length,
      leases: scoped.filter((property) =>
        propertyInLeaseView(property, currentLeaseFor(property.id), 'all', leaseWindow),
      ).length,
    }),
    [accounting, currentLeaseFor, leaseWindow, needActionCountFor, scoped],
  );

  const leaseCounts = useMemo(() => {
    const leased = scoped.filter((property) =>
      propertyInLeaseView(property, currentLeaseFor(property.id), 'all', leaseWindow),
    );
    return {
      all: leased.length,
      expiring: leased.filter((property) =>
        propertyInLeaseView(property, currentLeaseFor(property.id), 'expiring', leaseWindow),
      ).length,
      periodic: leased.filter((property) =>
        propertyInLeaseView(property, currentLeaseFor(property.id), 'periodic', leaseWindow),
      ).length,
    };
  }, [currentLeaseFor, leaseWindow, scoped]);

  const filtered = useMemo(() => {
    let rows = scoped;
    if (directory === 'arrears') {
      rows = filterPropertiesForListV2(rows, 'arrears', accounting, needActionCountFor);
    }
    if (directory === 'leases') {
      rows = rows.filter((property) =>
        propertyInLeaseView(property, currentLeaseFor(property.id), leaseView, leaseWindow),
      );
    }
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
    return sortPropertiesForListV2(rows, sort, accounting);
  }, [
    accounting,
    currentLeaseFor,
    directory,
    leaseView,
    leaseWindow,
    needActionCountFor,
    scoped,
    search,
    sort,
  ]);

  const moreFilterCount =
    (occupancy !== 'all' ? 1 : 0) + (needsAttention ? 1 : 0) + (archived ? 1 : 0);
  const filtersNarrowed =
    Boolean(search.trim()) ||
    directory !== 'all' ||
    occupancy !== 'all' ||
    needsAttention ||
    archived;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [archived, directory, leaseView, leaseWindow, needsAttention, occupancy, search, sort, pageSize]);

  useEffect(() => {
    if (!hasFullManagementAccess && directory === 'arrears') {
      setDirectory('all');
      if (sort === 'arrears') setSort('newest');
    }
  }, [directory, hasFullManagementAccess, sort]);

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
  const sortOptions = PROPERTY_LIST_V2_SORTS.filter(
    (option) => option.id !== 'arrears' || directory === 'arrears',
  );

  const selectDirectory = (next: PropertyDirectoryTab) => {
    setDirectory(next);
    if (next === 'arrears') setSort('arrears');
    else if (sort === 'arrears') setSort('newest');
  };

  return (
    <div className="property-list-v2 normal-case flex flex-col gap-4 px-4 py-4 lg:px-6 lg:py-5">
      <PropertiesPageHeaderActions className="flex flex-wrap gap-2 lg:hidden" />

      <div className="relative shrink-0" data-tour="properties-search">
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
        <div className="flex flex-wrap gap-2" data-tour="properties-occupancy">
          <DirectoryTab
            active={directory === 'all'}
            label="All Properties"
            count={directoryCounts.all}
            onClick={() => selectDirectory('all')}
          />
          {hasFullManagementAccess ? (
            <DirectoryTab
              active={directory === 'arrears'}
              label="Rent Arrears"
              count={directoryCounts.arrears}
              onClick={() => selectDirectory('arrears')}
              tour="properties-filter-arrears"
            />
          ) : null}
          <DirectoryTab
            active={directory === 'leases'}
            label="Leases"
            count={directoryCounts.leases}
            onClick={() => selectDirectory('leases')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-tour="properties-more-filters"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
                  moreFilterCount > 0
                    ? 'border-primary/30 bg-primary/12 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <SlidersHorizontal className="size-3.5" />
                More filters
                {moreFilterCount > 0 ? (
                  <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                    {moreFilterCount}
                  </span>
                ) : null}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-4 p-3">
              <div className="space-y-2">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Occupancy
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['all', 'All'],
                      ['occupied', 'Occupied'],
                      ['vacant', 'Vacant'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOccupancy(id)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-semibold',
                        occupancy === id
                          ? 'border-primary/30 bg-primary/12 text-primary'
                          : 'text-muted-foreground hover:bg-muted/60',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 text-sm font-medium">
                Needs attention
                <input
                  type="checkbox"
                  checked={needsAttention}
                  onChange={(event) => setNeedsAttention(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm font-medium">
                Archived
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(event) => setArchived(event.target.checked)}
                />
              </label>
            </PopoverContent>
          </Popover>
          <label className="text-muted-foreground flex items-center gap-2 text-xs" data-tour="properties-sort">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as PropertyListV2Sort)}
              className="border-input bg-background rounded-lg border px-2 py-1.5 text-xs font-semibold"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1 rounded-xl border bg-card p-1" data-tour="properties-view">
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

      {directory === 'leases' ? (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'All'],
              ['expiring', 'Expiring soon'],
              ['periodic', 'Periodic'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setLeaseView(id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold',
                leaseView === id
                  ? 'border-primary/30 bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {label} {leaseCounts[id]}
            </button>
          ))}
          {leaseView === 'expiring' ? (
            <div className="ml-1 flex items-center gap-1 rounded-full border p-0.5">
              {PROPERTY_LEASE_WINDOWS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setLeaseWindow(days)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                    leaseWindow === days ? 'bg-primary/12 text-primary' : 'text-muted-foreground',
                  )}
                >
                  {days} days
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={
            filtersNarrowed
              ? isArchivedView
                ? 'No matching archived properties'
                : 'No matching properties'
              : isArchivedView
                ? 'No archived properties'
                : 'No properties yet'
          }
          description={
            filtersNarrowed
              ? 'Try a different search or filter.'
              : isArchivedView
                ? 'Properties appear here after you archive them. Permanently deleted properties are removed entirely and will not show here.'
                : 'Add a property to start managing landlords and tenants.'
          }
          action={
            !filtersNarrowed && !isArchivedView ? (
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
            emphasizeArrears={directory === 'arrears'}
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

          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm"
            data-tour="properties-pagination"
          >
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

function DirectoryTab({
  active,
  label,
  count,
  onClick,
  tour,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  tour?: string;
}) {
  return (
    <button
      type="button"
      data-tour={tour}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-primary/30 bg-primary/12 text-primary'
          : 'text-muted-foreground hover:border-primary/20 hover:bg-muted/60 hover:text-foreground',
      )}
    >
      {label} {count}
    </button>
  );
}
