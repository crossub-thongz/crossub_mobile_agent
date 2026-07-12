import type { Layout, LayoutItem } from 'react-grid-layout';

export type DashboardWidgetId =
  | 'portfolio_map'
  | 'recent_properties'
  | 'recent_cases'
  | 'need_action'
  | 'quick_add_property'
  | 'kpi_properties'
  | 'kpi_maintenance'
  | 'kpi_inspections'
  | 'kpi_tribunal'
  | 'kpi_leasing'
  | 'kpi_accounting';

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  title: string;
  description: string;
  defaultSize: Pick<LayoutItem, 'w' | 'h' | 'minW' | 'minH'>;
}

export const DASHBOARD_WIDGET_CATALOG: DashboardWidgetDefinition[] = [
  {
    id: 'portfolio_map',
    title: 'Portfolio map',
    description: 'Google Map with pins for your managed properties.',
    defaultSize: { w: 8, h: 4, minW: 6, minH: 3 },
  },
  {
    id: 'recent_properties',
    title: 'Recent properties',
    description: 'Properties you opened recently.',
    defaultSize: { w: 6, h: 3, minW: 4, minH: 2 },
  },
  {
    id: 'recent_cases',
    title: 'Recent cases',
    description: 'Maintenance, inspections, and other cases you opened recently.',
    defaultSize: { w: 6, h: 3, minW: 4, minH: 2 },
  },
  {
    id: 'need_action',
    title: 'Need action',
    description: 'Portfolio items waiting on you.',
    defaultSize: { w: 4, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'quick_add_property',
    title: 'Add property',
    description: 'Shortcut to register a new property.',
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },
  },
  {
    id: 'kpi_properties',
    title: 'Properties KPI',
    description: 'Occupied vs vacant breakdown.',
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },
  },
  {
    id: 'kpi_maintenance',
    title: 'Maintenance KPI',
    description: 'Approval, in progress, and completed jobs.',
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },
  },
  {
    id: 'kpi_inspections',
    title: 'Inspections KPI',
    description: 'Open, ingoing, outgoing, and routine inspections.',
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },
  },
  {
    id: 'kpi_tribunal',
    title: 'Tribunal KPI',
    description: 'Active, action required, and closed tribunal cases.',
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },
  },
  {
    id: 'kpi_leasing',
    title: 'Leasing KPI',
    description: 'New leasing, rent reviews, and renewals.',
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },
  },
  {
    id: 'kpi_accounting',
    title: 'Accounting KPI',
    description: 'Properties in arrears vs paid up.',
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },
  },
];

export const DASHBOARD_WIDGET_BY_ID = Object.fromEntries(
  DASHBOARD_WIDGET_CATALOG.map((widget) => [widget.id, widget]),
) as Record<DashboardWidgetId, DashboardWidgetDefinition>;

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetId[] = [
  'portfolio_map',
  'kpi_properties',
  'kpi_maintenance',
  'kpi_inspections',
  'kpi_tribunal',
  'kpi_leasing',
  'kpi_accounting',
];

function layoutItem(
  id: DashboardWidgetId,
  x: number,
  y: number,
): LayoutItem {
  const def = DASHBOARD_WIDGET_BY_ID[id];
  return {
    i: id,
    x,
    y,
    w: def.defaultSize.w,
    h: def.defaultSize.h,
    minW: def.defaultSize.minW,
    minH: def.defaultSize.minH,
  };
}

export function buildDefaultLayout(widgets: DashboardWidgetId[]): Layout {
  const preset: Partial<Record<DashboardWidgetId, { x: number; y: number; w?: number; h?: number }>> = {
    portfolio_map: { x: 2, y: 0, w: 8, h: 4 },
    recent_properties: { x: 0, y: 4, w: 6, h: 3 },
    recent_cases: { x: 6, y: 4, w: 6, h: 3 },
    need_action: { x: 8, y: 0, w: 4, h: 4 },
    kpi_properties: { x: 0, y: 4, w: 4, h: 2 },
    kpi_maintenance: { x: 4, y: 4, w: 4, h: 2 },
    kpi_inspections: { x: 8, y: 4, w: 4, h: 2 },
    kpi_tribunal: { x: 0, y: 6, w: 4, h: 2 },
    kpi_leasing: { x: 4, y: 6, w: 4, h: 2 },
    kpi_accounting: { x: 8, y: 6, w: 4, h: 2 },
    quick_add_property: { x: 4, y: 11, w: 4, h: 2 },
  };

  let cursorY = 0;
  const items: LayoutItem[] = [];

  for (const id of widgets) {
    const def = DASHBOARD_WIDGET_BY_ID[id];
    const slot = preset[id];
    if (slot) {
      items.push({
        i: id,
        x: slot.x,
        y: slot.y,
        w: slot.w ?? def.defaultSize.w,
        h: slot.h ?? def.defaultSize.h,
        minW: def.defaultSize.minW,
        minH: def.defaultSize.minH,
      });
      cursorY = Math.max(cursorY, slot.y + (slot.h ?? def.defaultSize.h));
    } else {
      items.push(layoutItem(id, 0, cursorY));
      cursorY += def.defaultSize.h;
    }
  }

  return items;
}

export function appendWidgetToLayout(
  layout: Layout,
  widgetId: DashboardWidgetId,
): Layout {
  const def = DASHBOARD_WIDGET_BY_ID[widgetId];
  let maxY = 0;
  for (const item of layout) {
    maxY = Math.max(maxY, item.y + item.h);
  }
  return [
    ...layout,
    {
      i: widgetId,
      x: 0,
      y: maxY,
      w: def.defaultSize.w,
      h: def.defaultSize.h,
      minW: def.defaultSize.minW,
      minH: def.defaultSize.minH,
    },
  ];
}

export function layoutForWidgets(widgets: DashboardWidgetId[], saved?: Layout): Layout {
  if (!saved?.length) return buildDefaultLayout(widgets);
  const allowed = new Set(widgets);
  const filtered = saved.filter((item) => allowed.has(item.i as DashboardWidgetId));
  const missing = widgets.filter((id) => !filtered.some((item) => item.i === id));
  if (missing.length === 0) return filtered;
  let layout: Layout = filtered;
  for (const id of missing) {
    layout = appendWidgetToLayout(layout, id);
  }
  return layout;
}
