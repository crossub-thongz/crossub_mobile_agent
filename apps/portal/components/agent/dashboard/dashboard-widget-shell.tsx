'use client';

import { GripVertical, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DashboardWidgetShell({
  title,
  editing,
  onRemove,
  children,
}: {
  title: string;
  editing: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm',
        editing && 'ring-primary/20 ring-2',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b px-3 py-2',
          editing && 'dashboard-widget-handle cursor-grab bg-muted/30 active:cursor-grabbing',
        )}
      >
        {editing ? <GripVertical className="text-muted-foreground size-4 shrink-0" /> : null}
        <p className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</p>
        {editing && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label={`Remove ${title}`}
            onClick={onRemove}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}
