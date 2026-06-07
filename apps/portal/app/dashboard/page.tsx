'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BellRing, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import {
  DashboardSection,
  DASHBOARD_ICONS,
  InspectionKpiGroup,
  KpiTile,
} from '@/components/agent/dashboard-kpi-section';
import { PageIntro } from '@/components/agent/page-intro';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { dashboardKpis, notifications, remindingItems, loading } = useAgentData();
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
      <div className="space-y-5">
        <PageIntro description="Portfolio overview — tap any metric to open detailed records." />

        {remindingItems.length > 0 && (
          <Link
            href={ROUTES.REMINDING}
            className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-gradient-to-r from-destructive/10 to-destructive/5 p-4 transition hover:border-destructive/50"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <BellRing className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {remindingItems.length} item{remindingItems.length === 1 ? '' : 's'} need action
              </p>
              <p className="text-muted-foreground text-xs">Open your reminding queue</p>
            </div>
            <ChevronRight className="text-destructive size-5 shrink-0" />
          </Link>
        )}

        <DashboardSection title="Properties" icon={DASHBOARD_ICONS.properties}>
          <KpiTile label="Total" value={k.properties.total} href={k.properties.href} />
          <KpiTile label="Occupied" value={k.properties.occupied} href={ROUTES.PROPERTIES} />
          <KpiTile
            label="Vacant"
            value={k.properties.vacant}
            href={`${ROUTES.PROPERTIES}?filter=vacant`}
            highlight={k.properties.vacant > 0}
          />
        </DashboardSection>

        <DashboardSection
          title="Leasing"
          icon={DASHBOARD_ICONS.leasing}
          description="Tap to open the Leasing hub"
        >
          <KpiTile
            label="Upcoming rent reviews"
            value={k.leasing.upcomingRentReviews}
            href={k.leasing.rentReviewHref}
            highlight={k.leasing.upcomingRentReviews > 0}
          />
          <KpiTile
            label="New leasing"
            value={k.leasing.newLeasing}
            href={k.leasing.newLeasingHref}
            highlight={k.leasing.newLeasing > 0}
          />
        </DashboardSection>

        <DashboardSection title="Maintenance" icon={DASHBOARD_ICONS.maintenance}>
          <KpiTile
            label="In progress"
            value={k.maintenance.inProgress}
            href={k.maintenance.inProgressHref}
          />
          <KpiTile
            label="Completed"
            value={k.maintenance.completed}
            href={k.maintenance.completedHref}
          />
          <KpiTile
            label="Awaiting approval"
            value={k.maintenance.pendingApproval}
            href={k.maintenance.approvalHref}
            highlight={k.maintenance.pendingApproval > 0}
          />
        </DashboardSection>

        <InspectionKpiGroup
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

        <DashboardSection title="Accounting" icon={DASHBOARD_ICONS.accounting}>
          <KpiTile
            label="Rental income (YTD)"
            value={formatCurrency(k.accounting.totalRentalIncome)}
            href={k.accounting.incomeHref}
          />
          <KpiTile
            label="In arrears"
            value={k.accounting.propertiesInArrears}
            href={k.accounting.arrearsHref}
            highlight={k.accounting.propertiesInArrears > 0}
          />
          <KpiTile
            label="Total arrears"
            value={formatCurrency(k.accounting.totalArrearsAmount)}
            href={k.accounting.arrearsHref}
            highlight={k.accounting.totalArrearsAmount > 0}
          />
        </DashboardSection>
      </div>
    </AgentShell>
  );
}
