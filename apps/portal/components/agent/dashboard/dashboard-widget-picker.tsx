'use client';

import {
  DASHBOARD_WIDGET_CATALOG,
  DASHBOARD_WIDGET_BY_ID,
  type DashboardWidgetId,
} from '@/lib/dashboard-widgets';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function DashboardWidgetPicker({
  open,
  onOpenChange,
  activeWidgets,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeWidgets: DashboardWidgetId[];
  onAdd: (widgetId: DashboardWidgetId) => void;
}) {
  const active = new Set(activeWidgets);
  const available = DASHBOARD_WIDGET_CATALOG.filter((widget) => !active.has(widget.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add dashboard widget</DialogTitle>
          <DialogDescription>
            Choose a widget to place on your dashboard. Drag and resize it after adding.
          </DialogDescription>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            All widgets are already on your dashboard.
          </p>
        ) : (
          <ul className="space-y-2">
            {available.map((widget) => (
              <li key={widget.id}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(widget.id);
                    onOpenChange(false);
                  }}
                  className="hover:border-primary/30 w-full rounded-xl border bg-card px-4 py-3 text-left transition hover:bg-muted/20"
                >
                  <p className="text-sm font-semibold">{widget.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{widget.description}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
        {activeWidgets.length > 0 ? (
          <div className="border-t pt-3">
            <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
              On your dashboard
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeWidgets.map((id) => (
                <span
                  key={id}
                  className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-medium"
                >
                  {DASHBOARD_WIDGET_BY_ID[id].title}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
