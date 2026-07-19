'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Plus, RotateCcw } from 'lucide-react';
import {
  Responsive,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type ResponsiveLayouts,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

import { ClassicDashboard } from '@/components/agent/dashboard/classic-dashboard';
import {
  dashboardWidgetTitle,
  DashboardWidgetContent,
} from '@/components/agent/dashboard/dashboard-widget-content';
import { DashboardWidgetPicker } from '@/components/agent/dashboard/dashboard-widget-picker';
import { DashboardWidgetShell } from '@/components/agent/dashboard/dashboard-widget-shell';
import type { DashboardWidgetRenderContext } from '@/components/agent/dashboard/dashboard-widget-types';
import { Button } from '@/components/ui/button';
import {
  appendWidgetToLayout,
  type DashboardWidgetId,
} from '@/lib/dashboard-widgets';
import {
  defaultDashboardSnapshot,
  DASHBOARD_LAYOUT_UPDATED_EVENT,
  readDashboardLayout,
  resetToClassicDashboard,
  writeDashboardLayout,
  type DashboardLayoutSnapshot,
} from '@/lib/dashboard-layout-storage';
import { cn } from '@/lib/utils';

import './dashboard-grid.css';

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 0 } as const;
const COLS = { lg: 12, md: 10, sm: 6, xs: 1 } as const;

function syncLayoutsForWidgets(
  snapshot: DashboardLayoutSnapshot,
  widgets: DashboardWidgetId[],
): ResponsiveLayouts {
  const filterLayout = (layout?: Layout) =>
    (layout ?? []).filter((item) => widgets.includes(item.i as DashboardWidgetId));

  let lg: Layout = filterLayout(snapshot.layouts.lg);
  let md: Layout = filterLayout(snapshot.layouts.md ?? snapshot.layouts.lg);
  let sm: Layout = filterLayout(snapshot.layouts.sm ?? snapshot.layouts.lg);
  let xs: Layout = filterLayout(snapshot.layouts.xs ?? snapshot.layouts.sm ?? snapshot.layouts.lg);

  for (const id of widgets) {
    if (!lg.some((item) => item.i === id)) lg = appendWidgetToLayout(lg, id);
    if (!md.some((item) => item.i === id)) md = appendWidgetToLayout(md, id);
    if (!sm.some((item) => item.i === id)) {
      const appended = appendWidgetToLayout(sm, id);
      sm = appended.map((item) => ({ ...item, x: 0, w: COLS.sm }));
    }
    if (!xs.some((item) => item.i === id)) {
      const appended = appendWidgetToLayout(xs, id);
      xs = appended.map((item) => ({ ...item, x: 0, w: COLS.xs }));
    } else {
      xs = xs.map((item) => ({ ...item, x: 0, w: Math.min(item.w, COLS.xs) }));
    }
  }

  return { lg, md, sm, xs };
}

export function CustomizableDashboard({ context }: { context: DashboardWidgetRenderContext }) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<DashboardLayoutSnapshot>(() => readDashboardLayout());

  useEffect(() => {
    setSnapshot(readDashboardLayout());
    const onUpdate = () => setSnapshot(readDashboardLayout());
    window.addEventListener(DASHBOARD_LAYOUT_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(DASHBOARD_LAYOUT_UPDATED_EVENT, onUpdate);
  }, []);

  const customized = snapshot.customized;

  const widgets = useMemo(() => {
    const list = [...snapshot.widgets];
    return list.filter((id) => {
      if (id === 'quick_add_property' && !context.hasFullManagementAccess) return false;
      return true;
    });
  }, [context.hasFullManagementAccess, snapshot.widgets]);

  const layouts = useMemo(
    () => syncLayoutsForWidgets(snapshot, widgets),
    [snapshot, widgets],
  );

  const persist = useCallback((next: DashboardLayoutSnapshot) => {
    setSnapshot(next);
    writeDashboardLayout(next);
  }, []);

  const startCustomization = useCallback(() => {
    const next = defaultDashboardSnapshot();
    persist(next);
    setEditing(true);
  }, [persist]);

  const handleLayoutChange = useCallback(
    (_layout: Layout, allLayouts: ResponsiveLayouts) => {
      if (!editing) return;
      persist({
        customized: true,
        widgets,
        layouts: allLayouts,
      });
    },
    [editing, persist, widgets],
  );

  const removeWidget = useCallback(
    (widgetId: DashboardWidgetId) => {
      const nextWidgets = widgets.filter((id) => id !== widgetId);
      persist({
        customized: true,
        widgets: nextWidgets,
        layouts: syncLayoutsForWidgets(snapshot, nextWidgets),
      });
    },
    [persist, snapshot, widgets],
  );

  const addWidget = useCallback(
    (widgetId: DashboardWidgetId) => {
      if (widgets.includes(widgetId)) return;
      const nextWidgets = [...widgets, widgetId];
      persist({
        customized: true,
        widgets: nextWidgets,
        layouts: syncLayoutsForWidgets(snapshot, nextWidgets),
      });
    },
    [persist, snapshot, widgets],
  );

  const resetLayout = useCallback(() => {
    resetToClassicDashboard();
    setEditing(false);
    setSnapshot(readDashboardLayout());
  }, []);

  if (!customized) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={startCustomization}>
            <LayoutGrid className="size-4" />
            Customize
          </Button>
        </div>
        <ClassicDashboard context={context} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {editing
            ? 'Drag headers to move widgets. Resize from corners.'
            : 'Your personalized dashboard layout is saved on this device.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                <Plus className="size-4" />
                Add widget
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={resetLayout}>
                <RotateCcw className="size-4" />
                Reset
              </Button>
              <Button type="button" size="sm" onClick={() => setEditing(false)}>
                Done
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              <LayoutGrid className="size-4" />
              Customize
            </Button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn('dashboard-grid', editing && 'dashboard-grid--editing')}
      >
        {mounted ? (
          <Responsive
            width={width}
            layouts={layouts}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            rowHeight={width < 768 ? 88 : 72}
            margin={width < 768 ? ([8, 8] as const) : ([12, 12] as const)}
            containerPadding={[0, 0] as const}
            compactor={verticalCompactor}
            dragConfig={{
              enabled: editing,
              handle: '.dashboard-widget-handle',
              bounded: false,
              threshold: 3,
            }}
            resizeConfig={{
              enabled: editing,
              handles: ['se', 'sw', 'ne', 'nw'],
            }}
            onLayoutChange={handleLayoutChange}
          >
            {widgets.map((widgetId) => (
              <div key={widgetId}>
                <DashboardWidgetShell
                  title={dashboardWidgetTitle(widgetId)}
                  editing={editing}
                  onRemove={editing ? () => removeWidget(widgetId) : undefined}
                >
                  <DashboardWidgetContent widgetId={widgetId} context={context} />
                </DashboardWidgetShell>
              </div>
            ))}
          </Responsive>
        ) : (
          <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm">
            Loading dashboard…
          </div>
        )}
      </div>

      <DashboardWidgetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        activeWidgets={widgets}
        onAdd={addWidget}
      />
    </div>
  );
}
