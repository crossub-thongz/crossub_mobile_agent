'use client';

import type { Layout, ResponsiveLayouts } from 'react-grid-layout';

import {
  DEFAULT_DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_BY_ID,
  layoutForWidgets,
  type DashboardWidgetId,
} from '@/lib/dashboard-widgets';

const STORAGE_KEY = 'crossub:agent-dashboard-layout-v1';

export type DashboardLayoutSnapshot = {
  /** When false, the classic static dashboard is shown. */
  customized: boolean;
  widgets: DashboardWidgetId[];
  layouts: ResponsiveLayouts;
};

const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: layoutForWidgets(DEFAULT_DASHBOARD_WIDGETS),
  md: layoutForWidgets(DEFAULT_DASHBOARD_WIDGETS),
  sm: layoutForWidgets(DEFAULT_DASHBOARD_WIDGETS).map((item) => ({
    ...item,
    x: 0,
    w: 6,
  })),
  xs: layoutForWidgets(DEFAULT_DASHBOARD_WIDGETS).map((item) => ({
    ...item,
    x: 0,
    w: 1,
  })),
};

function defaultGridSnapshot(): Pick<DashboardLayoutSnapshot, 'widgets' | 'layouts'> {
  return {
    widgets: [...DEFAULT_DASHBOARD_WIDGETS],
    layouts: {
      lg: [...DEFAULT_LAYOUTS.lg!],
      md: [...DEFAULT_LAYOUTS.md!],
      sm: [...DEFAULT_LAYOUTS.sm!],
      xs: [...DEFAULT_LAYOUTS.xs!],
    },
  };
}

/** Starting point when the user first enables customization. */
export function defaultDashboardSnapshot(): DashboardLayoutSnapshot {
  return {
    customized: true,
    ...defaultGridSnapshot(),
  };
}

export function classicDashboardSnapshot(): DashboardLayoutSnapshot {
  return {
    customized: false,
    ...defaultGridSnapshot(),
  };
}

function isWidgetId(value: string): value is DashboardWidgetId {
  return value in DASHBOARD_WIDGET_BY_ID;
}

function parseStoredSnapshot(raw: string): DashboardLayoutSnapshot | null {
  const parsed = JSON.parse(raw) as Partial<DashboardLayoutSnapshot>;
  if (!Array.isArray(parsed.widgets) || !parsed.layouts) return null;

  const widgets = parsed.widgets.filter(
    (id): id is DashboardWidgetId => typeof id === 'string' && isWidgetId(id),
  );
  if (widgets.length === 0) return null;

  const customized = parsed.customized ?? true;

  return {
    customized,
    widgets,
    layouts: {
      lg: layoutForWidgets(widgets, parsed.layouts.lg),
      md: layoutForWidgets(widgets, parsed.layouts.md ?? parsed.layouts.lg),
      sm: layoutForWidgets(widgets, parsed.layouts.sm ?? parsed.layouts.lg).map((item) => ({
        ...item,
        x: 0,
        w: 6,
      })),
      xs: layoutForWidgets(
        widgets,
        parsed.layouts.xs ?? parsed.layouts.sm ?? parsed.layouts.lg,
      ).map((item) => ({
        ...item,
        x: 0,
        w: 1,
      })),
    },
  };
}

export function readDashboardLayout(): DashboardLayoutSnapshot {
  if (typeof window === 'undefined') return classicDashboardSnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return classicDashboardSnapshot();
    return parseStoredSnapshot(raw) ?? classicDashboardSnapshot();
  } catch {
    return classicDashboardSnapshot();
  }
}

export function writeDashboardLayout(snapshot: DashboardLayoutSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    window.dispatchEvent(new CustomEvent('crossub:agent-dashboard-layout-updated'));
  } catch {
    // best-effort
  }
}

export function resetToClassicDashboard(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('crossub:agent-dashboard-layout-updated'));
  } catch {
    // best-effort
  }
}

export const DASHBOARD_LAYOUT_UPDATED_EVENT = 'crossub:agent-dashboard-layout-updated';
