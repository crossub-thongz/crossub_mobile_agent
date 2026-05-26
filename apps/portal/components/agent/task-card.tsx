import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { DataSourceBadge } from '@/components/agent/data-source-badge';
import { StatusBadge } from '@/components/agent/status-badge';
import type { DashboardItem } from '@/lib/types';
import { cn, formatDateTime, formatRelative } from '@/lib/utils';

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
              <StatusBadge label="Approval" variant="approval" />
            )}
            {'source' in item && item.source && (
              <DataSourceBadge source={item.source} />
            )}
            {item.priority === 'urgent' && (
              <StatusBadge label="Urgent" priority="urgent" />
            )}
            <StatusBadge label={item.status} />
          </div>
          <p className="text-sm font-semibold leading-snug">{item.title}</p>
          <p className="text-muted-foreground text-xs">{item.subtitle}</p>
          <p className="text-muted-foreground truncate text-xs">
            {item.propertyAddress}
          </p>
          {!compact && (
            <p className="text-muted-foreground text-[11px]">
              Updated {formatRelative(item.updatedAt)}
              {item.dueAt ? ` · Due ${formatDateTime(item.dueAt)}` : ''}
            </p>
          )}
        </div>
        <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
      </div>
    </Link>
  );
}
