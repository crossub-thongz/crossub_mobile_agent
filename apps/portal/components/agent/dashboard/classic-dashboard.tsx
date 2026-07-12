'use client';

import Link from 'next/link';
import { Activity, Plus } from 'lucide-react';

import { DashboardChartHub } from '@/components/agent/dashboard-chart-hub';
import { DashboardPropertiesMap } from '@/components/agent/dashboard-properties-map';
import { DashboardRecentActivities } from '@/components/agent/dashboard-recent-activities';
import { DashboardRecentLists } from '@/components/agent/dashboard-recent-lists';
import type { DashboardWidgetRenderContext } from '@/components/agent/dashboard/dashboard-widget-types';
import { Button } from '@/components/ui/button';
import { propertyNew, ROUTES } from '@/constants/routes';

const SECTION_TITLE_CLASS = 'text-sm font-semibold lg:text-base';

export function ClassicDashboard({ context }: { context: DashboardWidgetRenderContext }) {
  return (
    <div className="space-y-5">
      {context.hasFullManagementAccess ? (
        <Button asChild size="lg" className="h-12 w-full rounded-xl text-base font-semibold">
          <Link href={propertyNew()}>
            <Plus className="size-5" />
            Add new property
          </Link>
        </Button>
      ) : null}

      <section className="space-y-2">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:grid-rows-[auto_minmax(min(52vh,360px),1fr)] md:gap-x-5 md:gap-y-2">
          <h2 className={`order-1 md:col-start-1 md:row-start-1 ${SECTION_TITLE_CLASS}`}>
            Portfolio map
          </h2>

          <div className="order-3 flex items-center justify-between gap-2 md:order-2 md:col-start-2 md:row-start-1">
            <h2 className={`flex items-center gap-2 ${SECTION_TITLE_CLASS}`}>
              <Activity className="text-primary size-4 shrink-0" />
              Recent activities
            </h2>
            <Link
              href={ROUTES.NOTIFICATIONS}
              className="text-muted-foreground hover:text-foreground shrink-0 text-xs font-medium"
            >
              View all
            </Link>
          </div>

          <div className="order-2 flex h-full min-h-[220px] min-w-0 flex-col md:order-3 md:col-start-1 md:row-start-2 md:min-h-0">
            <DashboardPropertiesMap properties={context.properties} embedded showStats />
          </div>

          <div className="order-4 flex h-full min-h-[220px] min-w-0 flex-col md:col-start-2 md:row-start-2 md:min-h-0">
            <DashboardRecentActivities showTitle={false} className="h-full" />
          </div>
        </div>
      </section>

      <DashboardRecentLists />

      <DashboardChartHub k={context.dashboardKpis} />
    </div>
  );
}
