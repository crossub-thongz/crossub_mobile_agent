'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftRight, Building2, FileText, History, UserCheck } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { PageIntro } from '@/components/agent/page-intro';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import {
  LeasingCyclesTable,
  LeasingHistoryTable,
  RentReviewListTable,
  TenantSelectionsTable,
} from '@/components/agent/portfolio-module-tables';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  propertyNew,
  propertyTransfer,
  ROUTES,
} from '@/constants/routes';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import { leasingCycleToJobRow, rentReviewToJobRow } from '@/lib/portfolio-case-dialog';
import { formatPropertyFullAddress } from '@/lib/utils';

const TABS = [
  { id: 'new-leasing', label: 'New leasing' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'rent-review', label: 'Rent review' },
  { id: 'history', label: 'History' },
] as const;

type LeasingTab = (typeof TABS)[number]['id'];

export default function LeasingPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: LeasingTab =
    tabParam === 'rent-review' ||
    tabParam === 'history' ||
    tabParam === 'transfer' ||
    tabParam === 'new-leasing'
      ? tabParam
      : 'new-leasing';

  const [tab, setTab] = useState<LeasingTab>(initialTab);
  const [search, setSearch] = useState('');
  const { tenantSelections, rentReviews, leasingRecords, leasingCycles, properties } = useAgentData();
  const { selectedJob, selectedId, openJob, closeJob, portfolioData, rentReviewDecisions } =
    usePortfolioCaseDialog();

  const openLeasingCycle = useCallback(
    (cycle: (typeof leasingCycles)[number]) => {
      const job = leasingCycleToJobRow(cycle, portfolioData);
      if (job) openJob(job);
    },
    [openJob, portfolioData],
  );

  const history = useMemo(() => {
    return leasingRecords.map((l) => {
      const property = properties.find((p) => p.id === l.propertyId);
      const address = property
        ? formatPropertyFullAddress(property)
        : l.propertyId;
      return { ...l, address };
    });
  }, [leasingRecords, properties]);

  const filteredCycles = useMemo(() => {
    if (!search.trim()) return leasingCycles;
    const q = search.toLowerCase();
    return leasingCycles.filter((c) => c.propertyAddress.toLowerCase().includes(q));
  }, [leasingCycles, search]);

  const filteredApplications = useMemo(() => {
    if (!search.trim()) return tenantSelections;
    const q = search.toLowerCase();
    return tenantSelections.filter(
      (t) =>
        t.propertyAddress.toLowerCase().includes(q) ||
        t.applicantName.toLowerCase().includes(q),
    );
  }, [tenantSelections, search]);

  const filteredRentReviews = useMemo(() => {
    if (!search.trim()) return rentReviews;
    const q = search.toLowerCase();
    return rentReviews.filter(
      (r) =>
        r.propertyAddress.toLowerCase().includes(q) ||
        (r.tenantName?.toLowerCase().includes(q) ?? false),
    );
  }, [rentReviews, search]);

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(
      (l) =>
        l.address.toLowerCase().includes(q) ||
        l.approvedTenant.toLowerCase().includes(q),
    );
  }, [history, search]);

  return (
    <AgentShell title="Leasing" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <PageIntro description="New applications, rent reviews, and tenancy history across your portfolio." />

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="w-full">
            <Link href={propertyNew()}>
              <Building2 className="size-4" />
              Add property
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={propertyTransfer()}>
              <ArrowLeftRight className="size-4" />
              Transfer OUT
            </Link>
          </Button>
        </div>

        <FilterChips
          options={TABS.map((t) => ({ id: t.id, label: t.label }))}
          value={tab}
          onChange={(id) => setTab(id as LeasingTab)}
        />

        {tab !== 'transfer' ? (
          <Input
            placeholder="Search by property, tenant, or applicant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        ) : null}

        {tab === 'new-leasing' && (
          <section className="space-y-4">
            {filteredCycles.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Active leasing cycles</h2>
                <LeasingCyclesTable
                  items={filteredCycles}
                  selectedCycleId={selectedId}
                  onCycleClick={openLeasingCycle}
                />
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No active leasing cycles"
                description="When a vacant property enters the leasing pipeline in crossub_web, progress will appear here."
              />
            )}

            {filteredApplications.length === 0 ? (
              <EmptyState
                icon={UserCheck}
                title="No pending applications"
                description="When CROSSUB shortlists tenants for your vacant properties, they'll appear here for approval."
              />
            ) : (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Tenant applications</h2>
                <TenantSelectionsTable items={filteredApplications} />
              </div>
            )}
          </section>
        )}

        {tab === 'transfer' && (
          <section className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Transfer OUT hands a property to another managing agent. Select the property, enter
              their email, and download a zip with the property summary and all profile documents.
            </p>
            <Button asChild className="w-full">
              <Link href={propertyTransfer()}>Transfer OUT</Link>
            </Button>
          </section>
        )}

        {tab === 'rent-review' && (
          <section className="space-y-2">
            {filteredRentReviews.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No rent reviews"
                description="Upcoming lease renewals and rent reviews will appear here."
              />
            ) : (
              <RentReviewListTable
                items={filteredRentReviews}
                selectedId={selectedId}
                onItemClick={(item) => openJob(rentReviewToJobRow(item, rentReviewDecisions))}
              />
            )}
          </section>
        )}

        {tab === 'history' && (
          <section className="space-y-3">
            {filteredHistory.length === 0 ? (
              <EmptyState
                icon={History}
                title="No leasing history"
                description="Tenancy records appear per property once connected to crossub_web."
              />
            ) : (
              <LeasingHistoryTable items={filteredHistory} />
            )}
          </section>
        )}
        <ModuleCommunications
          categories={['Leasing']}
          title="Leasing emails & messages"
          emptyHint="Leasing-related emails and messages across your portfolio appear here."
        />
        <PortfolioCaseDialogHost
          job={selectedJob}
          onClose={closeJob}
          onOpenJob={openJob}
        />
      </div>
    </AgentShell>
  );
}
