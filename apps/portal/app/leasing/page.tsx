'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftRight, Building2, ChevronRight, FileText, History, UserCheck, UserPlus } from 'lucide-react';

import { CaseWorkflowProgressCard } from '@/components/agent/case-workflow-progress-card';
import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { PageIntro } from '@/components/agent/page-intro';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  propertyDetail,
  propertyNew,
  propertyTransfer,
  rentReviewDetail,
  ROUTES,
  tenantNew,
  tenantSelectionDetail,
} from '@/constants/routes';
import { fromLeasing } from '@/lib/detail-navigation';
import {
  leasingLifecycleProgress,
  leasingOnboardingProgress,
  rentReviewWorkflowProgress,
} from '@/lib/case-workflows';
import { isRentReviewPendingApproval } from '@/lib/rent-review';
import { useAgentStore } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';

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
        ? `${property.address}, ${property.suburb}`
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
          <section className="space-y-3">
            {leasingCycles.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Active leasing cycles</h2>
                {leasingCycles.map((cycle) => {
                  const onboarding = leasingOnboardingProgress(cycle);
                  return (
                    <div key={cycle.id} className="space-y-3 rounded-2xl border bg-card p-4">
                      <Link
                        href={propertyDetail(cycle.propertyId)}
                        className="block font-semibold hover:text-primary"
                      >
                        {cycle.propertyAddress}
                      </Link>
                      <CaseWorkflowProgressCard progress={leasingLifecycleProgress(cycle)} />
                      {onboarding ? <CaseWorkflowProgressCard progress={onboarding} /> : null}
                    </div>
                  );
                })}
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
              tenantSelections.map((t) => (
                <Link
                  key={t.id}
                  href={tenantSelectionDetail(t.id)}
                  className="block rounded-2xl border bg-card p-4 transition hover:border-primary/25 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      {t.requiresApproval && (
                        <StatusBadge label="Action required" variant="approval" />
                      )}
                      <p className="truncate text-sm font-semibold">{t.propertyAddress}</p>
                      <p className="text-sm">{t.applicantName}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatCurrency(t.proposedRent)}/wk · {t.leaseTerm}
                      </p>
                      <p className="text-primary text-xs font-medium">{t.status}</p>
                    </div>
                    <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                  </div>
                </Link>
              ))
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
              rentReviews.map((r) => (
                <TaskStatusRow
                  key={r.id}
                  item={{
                    id: r.id,
                    propertyAddress: r.propertyAddress,
                    taskLabel: `Rent review · due ${formatDate(r.reviewDue)}`,
                    status: rentReviewWorkflowProgress(r).currentStepLabel,
                    href: rentReviewDetail(r.id, fromLeasing('rent-review')),
                    module: 'Rent review',
                    tone: isRentReviewPendingApproval(r, decisions[r.id])
                      ? 'warning'
                      : r.tenantResponse === 'counter'
                        ? 'neutral'
                        : 'ok',
                    requiresApproval: isRentReviewPendingApproval(r, decisions[r.id]),
                  }}
                />
              ))
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
              history.map((l) => (
                <Link
                  key={l.id}
                  href={`${propertyDetail(l.propertyId)}?tab=Leasing`}
                  className="block rounded-2xl border bg-card p-4 transition hover:border-primary/25"
                >
                  <p className="text-sm font-semibold">{l.address}</p>
                  <p className="text-muted-foreground mt-1 text-xs capitalize">{l.status} tenancy</p>
                  <p className="mt-2 text-sm">{l.approvedTenant}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(l.leaseStart)} — {formatDate(l.leaseEnd)} ·{' '}
                    {formatCurrency(l.rentWeekly)}/wk
                  </p>
                  {l.applicationCount != null && (
                    <p className="text-primary mt-2 text-[11px] font-medium">
                      {l.applicationCount} applications · open {formatDate(l.openInspectionDate!)}
                    </p>
                  )}
                  <span className="text-primary mt-2 inline-block text-xs font-medium">
                    View property →
                  </span>
                </Link>
              ))
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
