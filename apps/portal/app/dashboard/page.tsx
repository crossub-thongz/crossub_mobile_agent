'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { AgentPortfolioBanner } from '@/components/agent/agent-portfolio-banner';
import { TaskCard } from '@/components/agent/task-card';
import { AgentShell } from '@/components/layout/agent-shell';
import { ROUTES } from '@/constants/routes';
import { useAgentData } from '@/components/providers/agent-data-provider';

export default function DashboardPage() {
  const { dashboardItems, notifications, properties, loading } = useAgentData();

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
          <h2 className="text-sm font-semibold">Needs your action</h2>
          {approvals.length === 0 ? (
            <div className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm">
              <CheckCircle2 className="text-primary size-4 shrink-0" />
              Nothing waiting — you&apos;re all caught up
            </div>
          ) : (
            approvals.slice(0, 5).map((item) => <TaskCard key={item.id} item={item} />)
          )}
          {approvals.length > 5 && (
            <Link
              href={ROUTES.NOTIFICATIONS}
              className="text-primary block text-center text-xs font-medium"
            >
              View all {approvals.length} items
            </Link>
          )}
        </section>
      </div>
    </AgentShell>
  );
}
