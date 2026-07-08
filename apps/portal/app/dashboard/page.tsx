'use client';

import Link from 'next/link';
import { CheckCircle2, Plus } from 'lucide-react';

import { DashboardChartHub } from '@/components/agent/dashboard-chart-hub';
import { ExpandableNeedActionCard } from '@/components/agent/expandable-need-action-card';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { propertyNew, ROUTES } from '@/constants/routes';

export default function DashboardPage() {
  const { dashboardKpis, needActionGroups, needActionItems, hasFullManagementAccess } =
    useAgentData();
  const k = dashboardKpis;

  return (
    <AgentShell title="Dashboard">
      <div className="space-y-5">
        {hasFullManagementAccess && (
          <Button asChild size="lg" className="h-12 w-full rounded-xl text-base font-semibold">
            <Link href={propertyNew()}>
              <Plus className="size-5" />
              Add new property
            </Link>
          </Button>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold lg:text-base">Need action</h2>
          {needActionGroups.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="text-primary size-4 shrink-0" />
              Nothing waiting — you&apos;re all caught up
            </div>
          ) : (
            needActionGroups.map((g) => (
              <ExpandableNeedActionCard
                key={g.id}
                group={g}
                items={g.items.map((item) => ({
                  id: item.id,
                  label: item.label,
                  href: item.href,
                  propertyAddress: item.propertyAddress,
                }))}
              />
            ))
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
