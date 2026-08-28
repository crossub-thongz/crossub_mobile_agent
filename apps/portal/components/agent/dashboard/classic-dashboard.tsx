'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { DashboardChartHub } from '@/components/agent/dashboard-chart-hub';
import { DashboardPortfolioMapSection } from '@/components/agent/dashboard/dashboard-portfolio-map-section';
import { InspectionOnlyPlanBanner } from '@/components/agent/inspection-only-plan-banner';
import type { DashboardWidgetRenderContext } from '@/components/agent/dashboard/dashboard-widget-types';
import { Button } from '@/components/ui/button';
import { propertyNew } from '@/constants/routes';

export function ClassicDashboard({ context }: { context: DashboardWidgetRenderContext }) {
  return (
    <div className="space-y-5">
      <InspectionOnlyPlanBanner />

      {context.hasFullManagementAccess ? (
        <Button asChild size="lg" className="h-12 w-full rounded-xl text-base font-semibold ui-v2:h-11 ui-v2:rounded-lg ui-v2:text-sm">
          <Link href={propertyNew()}>
            <Plus className="size-5 ui-v2:size-4" />
            Add new property
          </Link>
        </Button>
      ) : (
        <Button asChild size="lg" className="h-12 w-full rounded-xl text-base font-semibold ui-v2:h-11 ui-v2:rounded-lg ui-v2:text-sm">
          <Link href={propertyNew()}>
            <Plus className="size-5 ui-v2:size-4" />
            Add property for inspection
          </Link>
        </Button>
      )}

      <DashboardPortfolioMapSection properties={context.properties} />

      <DashboardChartHub k={context.dashboardKpis} hasFullManagementAccess={context.hasFullManagementAccess} />
    </div>
  );
}
