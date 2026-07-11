'use client';

import Link from 'next/link';
import { ListTodo, Plus } from 'lucide-react';

import {
  DashboardKpiWidget,
  type DashboardKpiWidgetKey,
} from '@/components/agent/dashboard-chart-hub';
import { DashboardPropertiesMap } from '@/components/agent/dashboard-properties-map';
import {
  DashboardRecentCasesList,
  DashboardRecentPropertiesList,
} from '@/components/agent/dashboard-recent-lists';
import { propertyNew, ROUTES } from '@/constants/routes';
import { DASHBOARD_WIDGET_BY_ID, type DashboardWidgetId } from '@/lib/dashboard-widgets';
import { Button } from '@/components/ui/button';

import type { DashboardWidgetRenderContext } from './dashboard-widget-types';

function NeedActionWidget({ count }: { count: number }) {
  return (
    <Link
      href={ROUTES.TASKS}
      className="flex h-full flex-col justify-between rounded-2xl border bg-card p-4 transition hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex items-center gap-2">
        <ListTodo className="text-primary size-5" />
        <p className="text-sm font-semibold">Need action</p>
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums">{count}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {count === 0 ? 'All caught up' : 'Items waiting on you'}
        </p>
      </div>
    </Link>
  );
}

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
      return <NeedActionWidget count={context.needActionCount} />;
    case 'quick_add_property':
      return context.hasFullManagementAccess ? (
        <QuickAddPropertyWidget />
      ) : (
        <p className="text-muted-foreground flex h-full items-center justify-center text-xs">
          Full management access required.
        </p>
      );
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
