import type { DashboardKpis, Property } from '@/lib/types';
import type { DashboardWidgetId } from '@/lib/dashboard-widgets';

export type DashboardWidgetRenderContext = {
  properties: Property[];
  dashboardKpis: DashboardKpis;
  needActionCount: number;
  hasFullManagementAccess: boolean;
};

export type DashboardWidgetProps = {
  widgetId: DashboardWidgetId;
  context: DashboardWidgetRenderContext;
};
