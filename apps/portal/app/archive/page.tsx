'use client';

import { useMemo, useState } from 'react';
import { FolderArchive } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import {
  ArchivedEndLeasingTable,
  ArchivedLeasingCyclesTable,
  ArchivedRentReviewsTable,
} from '@/components/agent/archive-module-tables';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';

const TABS = [
  { id: 'new-letting', label: 'New letting' },
  { id: 'end-leasing', label: 'End leasing' },
  { id: 'rent-review', label: 'Rent review' },
  { id: 'maintenance', label: 'Maintenance' },
] as const;

type ArchiveTab = (typeof TABS)[number]['id'];

export default function ArchivePage() {
  const [tab, setTab] = useState<ArchiveTab>('new-letting');
  const { archive } = useAgentData();

  const tabCounts = useMemo(
    () => ({
      'new-letting': archive.cancelledLeasingCycles.length,
      'end-leasing': archive.cancelledEndLeasing.length,
      'rent-review': archive.cancelledRentReviews.length,
      maintenance: 0,
    }),
    [archive],
  );

  return (
    <AgentShell title="Archive" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <PageIntro description="Cancelled workflow jobs and the reasons recorded when they were closed." />

        <FilterChips
          options={TABS.map((t) => ({
            id: t.id,
            label: `${t.label}${tabCounts[t.id] > 0 ? ` (${tabCounts[t.id]})` : ''}`,
          }))}
          value={tab}
          onChange={(id) => setTab(id as ArchiveTab)}
        />

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
          archive.cancelledEndLeasing.length === 0 ? (
            <EmptyState
              icon={FolderArchive}
              title="No cancelled end-leasing cases"
              description="Cancelled end-leasing cases with a recorded reason will appear here."
            />
          ) : (
            <ArchivedEndLeasingTable items={archive.cancelledEndLeasing} />
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
