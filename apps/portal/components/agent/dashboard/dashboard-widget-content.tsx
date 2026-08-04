'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import {
  DashboardKpiWidget,
  type DashboardKpiWidgetKey,
} from '@/components/agent/dashboard-chart-hub';
import { DashboardNeedActionPreview } from '@/components/agent/dashboard-need-action-preview';
import { DashboardPropertiesMap } from '@/components/agent/dashboard-properties-map';
import {
  DashboardRecentCasesList,
  DashboardRecentPropertiesList,
} from '@/components/agent/dashboard-recent-lists';
import { propertyNew, ROUTES } from '@/constants/routes';
import { DASHBOARD_WIDGET_BY_ID, type DashboardWidgetId } from '@/lib/dashboard-widgets';
import { isDashboardKpiWidgetAllowedForAgent } from '@/lib/portal-service-level';
import { Button } from '@/components/ui/button';

import type { DashboardWidgetRenderContext } from './dashboard-widget-types';

function QuickAddPropertyWidget() {
  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border bg-card p-4">
      <p className="text-muted-foreground mb-3 text-xs">Register a new managed property</p>
      <Button asChild size="lg" className="h-11 w-full rounded-xl">
        <Link href={propertyNew()}>
          <Plus className="size-4" />
          Add new property
        </Link>
      </Button>
    </div>
  );
}

export function DashboardWidgetContent({
  widgetId,
  context,
}: {
  widgetId: DashboardWidgetId;
  context: DashboardWidgetRenderContext;
}) {
  switch (widgetId) {
    case 'portfolio_map':
      return <DashboardPropertiesMap properties={context.properties} embedded />;
    case 'recent_properties':
      return <DashboardRecentPropertiesList showTitle={false} />;
    case 'recent_cases':
      return <DashboardRecentCasesList showTitle={false} />;
    case 'need_action':
      return <DashboardNeedActionPreview showTitle={false} className="h-full" />;
    case 'quick_add_property':
      return <QuickAddPropertyWidget />;
    case 'kpi_properties':
    case 'kpi_maintenance':
    case 'kpi_inspections':
    case 'kpi_tribunal':
    case 'kpi_leasing':
    case 'kpi_accounting':
      return (
        <DashboardKpiWidget
          widgetId={widgetId as DashboardKpiWidgetKey}
          k={context.dashboardKpis}
          hasFullManagementAccess={context.hasFullManagementAccess}
          className="h-full"
        />
      );
    default:
      return null;
  }
}

export function dashboardWidgetTitle(widgetId: DashboardWidgetId): string {
  return DASHBOARD_WIDGET_BY_ID[widgetId]?.title ?? widgetId;
}
