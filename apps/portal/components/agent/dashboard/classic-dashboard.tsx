'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { DashboardChartHub } from '@/components/agent/dashboard-chart-hub';
import { DashboardPropertiesMap } from '@/components/agent/dashboard-properties-map';
import type { DashboardWidgetRenderContext } from '@/components/agent/dashboard/dashboard-widget-types';
import { Button } from '@/components/ui/button';
import { propertyNew } from '@/constants/routes';

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
        <h2 className={`text-center ${SECTION_TITLE_CLASS}`}>Portfolio map</h2>
        <div className="mx-auto w-full md:w-2/3">
          <DashboardPropertiesMap
            properties={context.properties}
            embedded
            showStats
            dashboardTile
          />
        </div>
      </section>

      <DashboardChartHub k={context.dashboardKpis} />
    </div>
  );
}
