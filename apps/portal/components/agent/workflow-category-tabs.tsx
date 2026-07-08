'use client';

import { cn } from '@/lib/utils';

export interface WorkflowCategoryTab {
  id: string;
  label: string;
  count: number;
}

export function WorkflowCategoryTabs({
  tabs,
  value,
  onChange,
  className,
  showCount = true,
}: {
  tabs: WorkflowCategoryTab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  showCount?: boolean;
}) {
  const visible = tabs.filter((tab) => tab.count > 0);
  if (visible.length <= 1) return null;

  return (
    <div className={cn('scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1', className)}>
      {visible.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {tab.label}
            {showCount ? (
              <span
                className={cn(
                  'inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                  active
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
