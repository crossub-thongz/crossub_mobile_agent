'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { AgentPortfolioBanner } from '@/components/agent/agent-portfolio-banner';
import { SectionStatusGrid } from '@/components/agent/section-status-grid';
import { TaskCard } from '@/components/agent/task-card';
import { AgentShell } from '@/components/layout/agent-shell';
import { ROUTES } from '@/constants/routes';
import { useAgentData } from '@/components/providers/agent-data-provider';

export default function DashboardPage() {
  const {
    dashboardItems,
    notifications,
    properties,
    loading,
    sectionStatus,
  } = useAgentData();

  const approvals = dashboardItems.filter((i) => i.requiresApproval);
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
    <AgentShell title="Home">
      <div className="space-y-5">
        <AgentPortfolioBanner propertyCount={properties.length} />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Needs your action</h2>
            {approvals.length > 3 && (
              <Link href={ROUTES.NOTIFICATIONS} className="text-primary text-xs font-medium">
                See all
              </Link>
            )}
          </div>
          {approvals.length === 0 ? (
            <div className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm">
              <CheckCircle2 className="text-primary size-4 shrink-0" />
              Nothing waiting — you&apos;re all caught up
            </div>
          ) : (
            approvals.slice(0, 3).map((item) => <TaskCard key={item.id} item={item} />)
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Status by section</h2>
            <Link href={ROUTES.STATUS} className="text-primary flex items-center gap-0.5 text-xs font-medium">
              View all
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
          <SectionStatusGrid sections={sectionStatus} />
        </section>
      </div>
    </AgentShell>
  );
}
