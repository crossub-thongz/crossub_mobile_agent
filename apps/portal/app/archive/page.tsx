'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderArchive } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import {
  ArchivedEndLeasingTable,
  ArchivedLeasingCyclesTable,
  ArchivedRentReviewsTable,
} from '@/components/agent/archive-module-tables';
import { PropertyListView } from '@/components/agent/property-list-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import { buildEndLeasingArchiveRows } from '@/lib/archive-case-display';
import type { Property } from '@/lib/types';

const TABS = [
  { id: 'properties', label: 'Properties' },
  { id: 'new-letting', label: 'New letting' },
  { id: 'end-leasing', label: 'End leasing' },
  { id: 'rent-review', label: 'Rent review' },
  { id: 'maintenance', label: 'Maintenance' },
] as const;

type ArchiveTab = (typeof TABS)[number]['id'];

export default function ArchivePage() {
  const [tab, setTab] = useState<ArchiveTab>('properties');
  const {
    archive,
    vacating,
    archivedProperties,
    agencies,
    apiConnected,
    refreshArchivedProperties,
    restoreProperty,
  } = useAgentData();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const endLeasingArchiveRows = useMemo(
    () => buildEndLeasingArchiveRows(archive.cancelledEndLeasing, vacating),
    [archive.cancelledEndLeasing, vacating],
  );

  const tabCounts = useMemo(
    () => ({
      properties: archivedProperties.length,
      'new-letting': archive.cancelledLeasingCycles.length,
      'end-leasing': endLeasingArchiveRows.length,
      'rent-review': archive.cancelledRentReviews.length,
      maintenance: 0,
    }),
    [archive, archivedProperties.length, endLeasingArchiveRows.length],
  );

  useEffect(() => {
    if (apiConnected) {
      void refreshArchivedProperties();
    }
  }, [apiConnected, refreshArchivedProperties]);

  const handleRestore = async (property: Property) => {
    if (!apiConnected) {
      toast.error('Connect to the API to restore this property');
      return;
    }
    setRestoringId(property.id);
    try {
      await restoreProperty(property.id);
      toast.success('Property restored to your live list');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not restore property');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <AgentShell title="Archive" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <PageIntro description="Archived properties and closed workflow jobs — restore a property to return it to the live list. Closed jobs stay closed." />

        <FilterChips
          options={TABS.map((t) => ({
            id: t.id,
            label: `${t.label}${tabCounts[t.id] > 0 ? ` (${tabCounts[t.id]})` : ''}`,
          }))}
          value={tab}
          onChange={(id) => setTab(id as ArchiveTab)}
        />

        {tab === 'properties' ? (
          archivedProperties.length === 0 ? (
            <EmptyState
              icon={FolderArchive}
              title="No archived properties"
              description="Properties you archive leave the live list and appear here with their history."
            />
          ) : (
            <PropertyListView
              properties={archivedProperties}
              agencies={agencies}
              variant="archived"
              rowHref={(property) => propertyDetail(property.id)}
              onDelete={() => undefined}
              onRestore={(property) => void handleRestore(property)}
              restoringId={restoringId}
              canManage={false}
            />
          )
        ) : null}

        {tab === 'new-letting' ? (
          archive.cancelledLeasingCycles.length === 0 ? (
            <EmptyState
              icon={FolderArchive}
              title="No cancelled new lettings"
              description="When you cancel a new letting and provide a reason, it will appear here."
            />
          ) : (
            <ArchivedLeasingCyclesTable items={archive.cancelledLeasingCycles} />
          )
        ) : null}

        {tab === 'end-leasing' ? (
          endLeasingArchiveRows.length === 0 ? (
            <EmptyState
              icon={FolderArchive}
              title="No end-leasing archive"
              description="Deleted end-leasing cases and completed tenancies will appear here."
            />
          ) : (
            <ArchivedEndLeasingTable items={endLeasingArchiveRows} />
          )
        ) : null}

        {tab === 'rent-review' ? (
          archive.cancelledRentReviews.length === 0 ? (
            <EmptyState
              icon={FolderArchive}
              title="No archived rent reviews"
              description="When you delete a rent review and provide a reason, it will appear here."
            />
          ) : (
            <ArchivedRentReviewsTable items={archive.cancelledRentReviews} />
          )
        ) : null}

        {tab === 'maintenance' ? (
          <EmptyState
            icon={FolderArchive}
            title="No archived maintenance jobs"
            description="Cancelled maintenance jobs will appear here when that workflow is supported."
          />
        ) : null}
      </div>
    </AgentShell>
  );
}
