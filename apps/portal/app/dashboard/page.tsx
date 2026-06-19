'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardChartHub } from '@/components/agent/dashboard-chart-hub';
import { NeedActionAlertCard } from '@/components/agent/need-action-alert-card';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';

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

        <DashboardChartHub k={k} />
      </div>
    </AgentShell>
  );
}
