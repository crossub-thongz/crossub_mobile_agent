'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderArchive } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { HistoryPropertyTasksList } from '@/components/agent/history-property-tasks';
import { AgentHowToUseLink } from '@/components/agent/agent-module-tutorial';
import { PageIntro } from '@/components/agent/page-intro';
import { PropertyListView } from '@/components/agent/property-list-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import { useAgentStore } from '@/lib/store';
import { buildArchivedPropertyTaskGroups } from '@/lib/task-list-v2';
import type { Property } from '@/lib/types';

const TABS = [
  { id: 'properties', label: 'Properties' },
  { id: 'property-tasks', label: 'Properties Tasks' },
] as const;

type HistoryTab = (typeof TABS)[number]['id'];

export default function ArchivePage() {
  const [tab, setTab] = useState<HistoryTab>('properties');
  const {
    archivedProperties,
    agencies,
    apiConnected,
    refreshArchivedProperties,
    restoreProperty,
    leasingRecords,
    maintenanceAll,
    inspections,
    rentReviews,
    leasingCycles,
    tenantSelections,
    vacating,
    tribunalCases,
    accounting,
    archive,
  } = useAgentData();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const propertyTaskGroups = useMemo(
    () =>
      buildArchivedPropertyTaskGroups({
        archivedProperties,
        leasingRecords,
        maintenanceAll,
        inspections,
        rentReviews,
        rentReviewDecisions,
        leasingCycles,
        tenantSelections,
        vacating,
        tribunalCases,
        accounting,
        archive,
      }),
    [
      accounting,
      archive,
      archivedProperties,
      inspections,
      leasingCycles,
      leasingRecords,
      maintenanceAll,
      rentReviewDecisions,
      rentReviews,
      tenantSelections,
      tribunalCases,
      vacating,
    ],
  );
  const propertyTaskCount = useMemo(
    () => propertyTaskGroups.reduce((sum, group) => sum + group.rows.length, 0),
    [propertyTaskGroups],
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
    <AgentShell title="History" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageIntro description="Archived properties and their closed tasks." />
          <AgentHowToUseLink module="history" />
        </div>

        <FilterChips
          options={TABS.map((item) => ({
            id: item.id,
            label:
              item.id === 'properties'
                ? archivedProperties.length > 0
                  ? `${item.label} (${archivedProperties.length})`
                  : item.label
                : propertyTaskCount > 0
                  ? `${item.label} (${propertyTaskCount})`
                  : item.label,
          }))}
          value={tab}
          onChange={setTab}
        />

        {tab === 'properties' ? (
          archivedProperties.length === 0 ? (
            <EmptyState
              icon={FolderArchive}
              title="No property history"
              description="Properties you archive leave the live list and appear here."
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
        ) : propertyTaskGroups.length === 0 ? (
          <EmptyState
            icon={FolderArchive}
            title="No property tasks"
            description="When you archive a property, its tasks are closed and stored here under that address."
          />
        ) : (
          <HistoryPropertyTasksList groups={propertyTaskGroups} />
        )}
      </div>
    </AgentShell>
  );
}
