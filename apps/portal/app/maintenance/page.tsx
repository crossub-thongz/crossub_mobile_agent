'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { MaintenanceListTable } from '@/components/agent/portfolio-module-tables';
import { StatusBanner } from '@/components/agent/status-banner';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import { maintenanceToJobRow } from '@/lib/portfolio-case-dialog';
import { isTenantRejectedMaintenance } from '@/lib/maintenance/tenant-rejected';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'approval', label: 'Needs approval' },
  { id: 'progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'tenant_rejected', label: 'Tenant rejected' },
] as const;

export default function MaintenancePage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const [filter, setFilter] = useState(() => {
    if (urlFilter === 'approval') return 'approval';
    if (urlFilter === 'completed') return 'completed';
    if (urlFilter === 'progress') return 'progress';
    if (urlFilter === 'tenant_rejected') return 'tenant_rejected';
    return 'all';
  });
  const [search, setSearch] = useState('');
  const { maintenanceAll, sectionStatus } = useAgentData();
  const { selectedJob, selectedId, openJob, closeJob } = usePortfolioCaseDialog();

  const summary = sectionStatus.find((s) => s.id === 'maintenance');

  const list = useMemo(() => {
    let items = [...maintenanceAll];
    if (filter === 'approval') items = items.filter((m) => m.requiresApproval);
    if (filter === 'progress')
      items = items.filter(
        (m) =>
          !m.status.toLowerCase().includes('complete') &&
          !m.status.toLowerCase().includes('closed'),
      );
    if (filter === 'completed')
      items = items.filter(
        (m) =>
          m.status.toLowerCase().includes('complete') ||
          m.status.toLowerCase().includes('closed'),
      );
    // Matched on the tenant's recorded answer, not on status: a parked refusal reports "Tenant
    // rejected" but one answered before the API stopped closing these still reports Completed,
    // and both belong here. Those parked cases also fall into `progress` above, which is correct
    // — they are open work, even though nothing is progressing until an officer rules on them.
    if (filter === 'tenant_rejected') items = items.filter(isTenantRejectedMaintenance);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.propertyAddress.toLowerCase().includes(q),
      );
    }
    return items;
  }, [maintenanceAll, filter, search]);

  return (
    <AgentShell title="Maintenance">
      <div className="space-y-4 min-w-0">
        <StatusBanner
          status={summary?.statusLabel ?? 'No jobs'}
          tone={
            summary?.tone === 'urgent'
              ? 'urgent'
              : summary?.tone === 'warning'
                ? 'action'
                : 'ok'
          }
        />

        <Input
          placeholder="Search by address or issue…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11"
        />
        <FilterChips
          options={[...FILTERS]}
          value={filter}
          onChange={setFilter}
        />

        {list.length === 0 ? (
          <EmptyState
            title={search || filter !== 'all' ? 'No matching jobs' : 'No maintenance jobs'}
            description={
              filter === 'approval'
                ? 'Nothing waiting for your approval right now.'
                : filter === 'tenant_rejected'
                  ? 'No tenant has disputed a responsibility decision.'
                  : 'Open maintenance requests will appear here.'
            }
          />
        ) : (
          <MaintenanceListTable
            items={list}
            selectedId={selectedId}
            onItemClick={(item) => openJob(maintenanceToJobRow(item))}
          />
        )}
        <PortfolioCaseDialogHost
          job={selectedJob}
          onClose={closeJob}
          onOpenJob={openJob}
        />
        <ModuleCommunications
          categories={['Maintenance']}
          title="Maintenance emails & messages"
          emptyHint="Maintenance-related emails and messages across your portfolio appear here."
        />
      </div>
    </AgentShell>
  );
}
