'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { DashboardSection, KpiTile } from '@/components/agent/dashboard-kpi-section';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { dashboardKpis, notifications, loading } = useAgentData();
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
      <div className="space-y-6">
        <p className="text-muted-foreground text-sm">
          Portfolio overview — tap any figure for details.
        </p>

        <DashboardSection title="Properties">
          <KpiTile label="Total properties" value={k.properties.total} href={k.properties.href} />
          <KpiTile label="Occupied" value={k.properties.occupied} href={ROUTES.PROPERTIES} />
          <KpiTile label="Vacant" value={k.properties.vacant} href={`${ROUTES.PROPERTIES}?filter=vacant`} highlight={k.properties.vacant > 0} />
        </DashboardSection>

        <DashboardSection title="Leasing">
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

        <DashboardSection title="Maintenance">
          <KpiTile label="In progress" value={k.maintenance.inProgress} href={k.maintenance.inProgressHref} />
          <KpiTile label="Completed" value={k.maintenance.completed} href={k.maintenance.completedHref} />
          <KpiTile
            label="Needs your approval"
            value={k.maintenance.pendingApproval}
            href={k.maintenance.approvalHref}
            highlight={k.maintenance.pendingApproval > 0}
          />
        </DashboardSection>

        <DashboardSection title="Inspection — Open">
          <KpiTile label="Pending" value={k.inspection.openPending} href={k.inspection.openHref} />
          <KpiTile label="Completed" value={k.inspection.openCompleted} href={k.inspection.openHref} />
        </DashboardSection>

        <DashboardSection title="Inspection — Ingoing / Outgoing">
          <KpiTile label="Ingoing pending" value={k.inspection.ingoingPending} href={k.inspection.ingoingHref} />
          <KpiTile label="Ingoing complete" value={k.inspection.ingoingCompleted} href={k.inspection.ingoingHref} />
          <KpiTile label="Outgoing pending" value={k.inspection.outgoingPending} href={k.inspection.outgoingHref} />
          <KpiTile label="Outgoing complete" value={k.inspection.outgoingCompleted} href={k.inspection.outgoingHref} />
        </DashboardSection>

        <DashboardSection title="Inspection — Routine">
          <KpiTile label="Routine pending" value={k.inspection.routinePending} href={k.inspection.routineHref} />
          <KpiTile label="Routine complete" value={k.inspection.routineCompleted} href={k.inspection.routineHref} />
        </DashboardSection>

        <DashboardSection title="Accounting">
          <KpiTile
            label="Rental income (YTD)"
            value={formatCurrency(k.accounting.totalRentalIncome)}
            href={k.accounting.incomeHref}
          />
          <KpiTile
            label="Properties in arrears"
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

        <Link
          href={ROUTES.REMINDING}
          className="text-primary block text-center text-sm font-medium"
        >
          View all items needing action →
        </Link>
      </div>
    </AgentShell>
  );
}
