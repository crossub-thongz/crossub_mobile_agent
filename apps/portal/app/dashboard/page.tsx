'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  DashboardHubSection,
  DASHBOARD_ICONS,
  InspectionKpiGroup,
} from '@/components/agent/dashboard-kpi-section';
import { NeedActionAlertCard } from '@/components/agent/need-action-alert-card';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { dashboardKpis, notifications, needActionGroups, needActionItems, loading } =
    useAgentData();
  const k = dashboardKpis;
  const pushShown = useRef(false);

  useEffect(() => {
    if (pushShown.current || loading) return;
    const urgent = notifications.filter((n) => !n.read && n.type === 'approval');
    if (urgent.length > 0) {
      pushShown.current = true;
      toast.info(urgent[0].title, {
        description: urgent[0].actionRequired ?? urgent[0].body,
        action: {
          label: 'Open',
          onClick: () => {
            window.location.href = urgent[0].href;
          },
        },
      });
    }
  }, [loading, notifications]);

  return (
    <AgentShell title="Dashboard">
      <div className="space-y-4">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Need action</h2>
          {needActionGroups.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="text-primary size-4 shrink-0" />
              Nothing waiting — you&apos;re all caught up
            </div>
          ) : (
            needActionGroups.map((g) => <NeedActionAlertCard key={g.id} group={g} />)
          )}
          {needActionItems.length > 0 && (
            <Link href={ROUTES.TASKS} className="text-primary block text-center text-xs font-medium">
              View all {needActionItems.length} items →
            </Link>
          )}
        </section>

        <DashboardHubSection
          title="Properties"
          icon={DASHBOARD_ICONS.properties}
          href={k.properties.href}
          accent="primary"
          description="Portfolio overview"
          stats={[
            { label: 'Total', value: k.properties.total, href: k.properties.href },
            {
              label: 'Occupied',
              value: k.properties.occupied,
              href: `${ROUTES.PROPERTIES}?filter=occupied`,
            },
            {
              label: 'Vacant',
              value: k.properties.vacant,
              href: `${ROUTES.PROPERTIES}?filter=vacant`,
              highlight: k.properties.vacant > 0,
            },
          ]}
        />

        <DashboardHubSection
          title="Leasing"
          icon={DASHBOARD_ICONS.leasing}
          href={k.leasing.href}
          accent="violet"
          description="Applications, rent reviews & renewals"
          stats={[
            {
              label: 'New leasing',
              value: k.leasing.newLeasing,
              href: k.leasing.newLeasingHref,
              highlight: k.leasing.newLeasing > 0,
            },
            {
              label: 'Rent reviews',
              value: k.leasing.upcomingRentReviews,
              href: k.leasing.rentReviewHref,
              highlight: k.leasing.upcomingRentReviews > 0,
            },
            {
              label: 'Lease renewals',
              value: k.leasing.leaseRenewals,
              href: k.leasing.leaseRenewalHref,
              highlight: k.leasing.leaseRenewals > 0,
            },
          ]}
        />

        <DashboardHubSection
          title="Maintenance"
          icon={DASHBOARD_ICONS.maintenance}
          href={k.maintenance.href}
          accent="amber"
          description="Jobs across your portfolio"
          stats={[
            {
              label: 'Pending approval',
              value: k.maintenance.pendingApproval,
              href: k.maintenance.approvalHref,
              highlight: k.maintenance.pendingApproval > 0,
            },
            {
              label: 'In progress',
              value: k.maintenance.inProgress,
              href: k.maintenance.inProgressHref,
            },
            {
              label: 'Completed',
              value: k.maintenance.completed,
              href: k.maintenance.completedHref,
            },
          ]}
        />

        <InspectionKpiGroup
          href={k.inspection.href}
          openPending={k.inspection.openPending}
          openCompleted={k.inspection.openCompleted}
          ingoingPending={k.inspection.ingoingPending}
          ingoingCompleted={k.inspection.ingoingCompleted}
          outgoingPending={k.inspection.outgoingPending}
          outgoingCompleted={k.inspection.outgoingCompleted}
          routinePending={k.inspection.routinePending}
          routineCompleted={k.inspection.routineCompleted}
          openHref={k.inspection.openHref}
          ingoingHref={k.inspection.ingoingHref}
          outgoingHref={k.inspection.outgoingHref}
          routineHref={k.inspection.routineHref}
        />

        <DashboardHubSection
          title="Accounting"
          icon={DASHBOARD_ICONS.accounting}
          href={k.accounting.href}
          accent="emerald"
          description="Income, arrears & bills"
          stats={[
            {
              label: 'Rent arrears',
              value: formatCurrency(k.accounting.totalArrearsAmount),
              href: k.accounting.arrearsHref,
              highlight: k.accounting.totalArrearsAmount > 0,
            },
            {
              label: 'Outstanding bills',
              value: formatCurrency(k.accounting.outstandingBills),
              href: k.accounting.arrearsHref,
              highlight: k.accounting.outstandingBills > 0,
            },
          ]}
        />
      </div>
    </AgentShell>
  );
}
