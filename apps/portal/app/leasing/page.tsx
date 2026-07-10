'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftRight, Building2, FileText, History, UserCheck, UserPlus } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { PageIntro } from '@/components/agent/page-intro';
import {
  LeasingCyclesTable,
  LeasingHistoryTable,
  RentReviewListTable,
  TenantSelectionsTable,
} from '@/components/agent/portfolio-module-tables';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  propertyNew,
  propertyTransfer,
  rentReviewDetail,
  ROUTES,
  tenantNew,
} from '@/constants/routes';
import { fromLeasing } from '@/lib/detail-navigation';
import { isRentReviewPendingApproval } from '@/lib/rent-review';
import { useAgentStore } from '@/lib/store';
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
  const { tenantSelections, rentReviews, leasingRecords, leasingCycles, properties } = useAgentData();
  const decisions = useAgentStore((s) => s.rentReviewDecisions);

  const pendingApplications = tenantSelections.filter((t) => t.requiresApproval);
  const pendingReviews = rentReviews.filter((r) =>
    isRentReviewPendingApproval(r, decisions[r.id]),
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

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="w-full">
            <Link href={tenantNew()}>
              <UserPlus className="size-4" />
              Add tenant
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={ROUTES.TENANTS}>Tenant accounts</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-muted-foreground text-[10px] font-medium uppercase">New leasing</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
              {pendingApplications.length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-muted-foreground text-[10px] font-medium uppercase">Rent reviews</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{pendingReviews.length}</p>
          </div>
        </div>

        <FilterChips
          options={TABS.map((t) => ({ id: t.id, label: t.label }))}
          value={tab}
          onChange={(id) => setTab(id as LeasingTab)}
        />

        {tab === 'new-leasing' && (
          <section className="space-y-4">
            {leasingCycles.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Active leasing cycles</h2>
                <LeasingCyclesTable items={leasingCycles} />
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No active leasing cycles"
                description="When a vacant property enters the leasing pipeline in crossub_web, progress will appear here."
              />
            )}

            {tenantSelections.length === 0 ? (
              <EmptyState
                icon={UserCheck}
                title="No pending applications"
                description="When CROSSUB shortlists tenants for your vacant properties, they'll appear here for approval."
              />
            ) : (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Tenant applications</h2>
                <TenantSelectionsTable items={tenantSelections} />
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
            {rentReviews.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No rent reviews"
                description="Upcoming lease renewals and rent reviews will appear here."
              />
            ) : (
              <RentReviewListTable
                items={rentReviews}
                detailHref={(id) => rentReviewDetail(id, fromLeasing('rent-review'))}
              />
            )}
          </section>
        )}

        {tab === 'history' && (
          <section className="space-y-3">
            {history.length === 0 ? (
              <EmptyState
                icon={History}
                title="No leasing history"
                description="Tenancy records appear per property once connected to crossub_web."
              />
            ) : (
              <LeasingHistoryTable items={history} />
            )}
          </section>
        )}
        <ModuleCommunications
          categories={['Leasing']}
          title="Leasing emails & messages"
          emptyHint="Leasing-related emails and messages across your portfolio appear here."
        />
      </div>
    </AgentShell>
  );
}
