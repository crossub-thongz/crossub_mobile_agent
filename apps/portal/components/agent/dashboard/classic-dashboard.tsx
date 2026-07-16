'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { DashboardChartHub } from '@/components/agent/dashboard-chart-hub';
import { DashboardPortfolioMapSection } from '@/components/agent/dashboard/dashboard-portfolio-map-section';
import type { DashboardWidgetRenderContext } from '@/components/agent/dashboard/dashboard-widget-types';
import { Button } from '@/components/ui/button';
import { propertyNew } from '@/constants/routes';

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

      <DashboardPortfolioMapSection properties={context.properties} />

      <DashboardChartHub k={context.dashboardKpis} />
    </div>
  );
}
