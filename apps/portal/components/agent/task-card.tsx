import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { DashboardItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function TaskCard({
  item,
  compact,
}: {
  item: DashboardItem;
  compact?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        'block rounded-xl border bg-card transition-colors active:bg-secondary/50',
        item.requiresApproval && 'border-primary/30',
        item.priority === 'urgent' && 'border-destructive/40',
      )}
    >
      <div className={cn('flex items-start gap-3 p-4', compact && 'p-3')}>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {item.requiresApproval && (
              <span className="text-primary text-[10px] font-semibold uppercase">
                Action needed
              </span>
            )}
            {item.priority === 'urgent' && (
              <span className="text-destructive text-[10px] font-semibold uppercase">
                Urgent
              </span>
            )}
          </div>
          <p className="text-primary text-xs font-medium">{item.status}</p>
          <p className="text-sm font-semibold leading-snug">{item.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {item.propertyAddress}
          </p>
          {!compact && item.subtitle && (
            <p className="text-muted-foreground text-xs">{item.subtitle}</p>
          )}
        </div>
        <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
      </div>
    </Link>
  );
}
