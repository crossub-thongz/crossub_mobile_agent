'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AlertTriangle, ChevronRight, ListTodo } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { CATEGORY_ICON } from '@/constants/gii-briefing';
import { ROUTES } from '@/constants/routes';
import type { PropertyNeedAction } from '@/lib/types';
import { cn } from '@/lib/utils';

const MAX_ITEMS = 6;

export function DashboardNeedActionPreview({
  showTitle = true,
  className,
}: {
  showTitle?: boolean;
  className?: string;
}) {
  const { needActionItems } = useAgentData();

  const items = useMemo(
    () =>
      [...needActionItems]
        .sort((a, b) => {
          const rank = (priority: PropertyNeedAction['priority']) =>
            priority === 'urgent' ? 0 : priority === 'high' ? 1 : 2;
          return rank(a.priority) - rank(b.priority);
        })
        .slice(0, MAX_ITEMS),
    [needActionItems],
  );

  return (
    <section className={cn('flex h-full min-h-0 flex-col', className)}>
      {showTitle ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold lg:text-base">
            <ListTodo className="text-primary size-4 shrink-0" />
            Need action
          </h2>
          <Link
            href={ROUTES.TASKS}
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs font-medium"
          >
            View all
          </Link>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center">
          <p className="text-muted-foreground text-xs">All caught up — nothing waiting on you.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-auto rounded-xl border bg-card shadow-sm min-h-0 flex-1">
          {items.map((item) => {
            const urgent = item.priority === 'urgent' || item.priority === 'high';
            const Icon = urgent ? AlertTriangle : CATEGORY_ICON[item.category];

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-3 text-sm transition hover:bg-muted/30"
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg',
                      urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="text-muted-foreground truncate text-xs">{item.propertyAddress}</p>
                    <p className="text-foreground/80 truncate text-[11px]">{item.category}</p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
