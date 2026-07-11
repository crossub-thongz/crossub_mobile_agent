'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { DashboardChartHub } from '@/components/agent/dashboard-chart-hub';
import { DashboardPropertiesMap } from '@/components/agent/dashboard-properties-map';
import { DashboardRecentLists } from '@/components/agent/dashboard-recent-lists';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { propertyNew } from '@/constants/routes';

export default function DashboardPage() {
  const { dashboardKpis, properties, hasFullManagementAccess } = useAgentData();
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
          <h2 className="text-sm font-semibold lg:text-base">Portfolio map</h2>
          <DashboardPropertiesMap properties={properties} />
        </section>

        <DashboardRecentLists />

        <DashboardChartHub k={k} />
      </div>
    </AgentShell>
  );
}
