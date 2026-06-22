'use client';

import Link from 'next/link';
import { ChevronRight, History, Mail, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { PropertyHistoryEntry } from '@/lib/property-history';
import { propertyHistoryKindLabel } from '@/lib/property-history';
import { formatDateTime } from '@/lib/utils';

export function PropertyHistorySection({
  entries,
  compact = false,
  onViewAll,
}: {
  entries: PropertyHistoryEntry[];
  compact?: boolean;
  onViewAll?: () => void;
}) {
  const preview = compact ? entries.slice(0, 4) : entries;

  if (entries.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">No historical records yet for this property.</p>
        {compact && onViewAll && (
          <Button type="button" variant="outline" className="w-full" onClick={onViewAll}>
            View history
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {preview.map((entry) => (
        <Link
          key={entry.id}
          href={entry.href}
          className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3 text-sm transition hover:border-primary/30"
        >
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
            {entry.kind === 'message' ? (
              <MessageSquare className="size-3.5" />
            ) : (
              <History className="size-3.5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              {propertyHistoryKindLabel(entry.kind)}
            </p>
            <p className="truncate font-medium">{entry.title}</p>
            {entry.subtitle && (
              <p className="text-muted-foreground truncate text-xs">{entry.subtitle}</p>
            )}
            <p className="text-muted-foreground mt-0.5 text-[10px]">
              {formatDateTime(entry.at)}
            </p>
          </div>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </Link>
      ))}
      {compact && onViewAll && (
        <Button type="button" variant="outline" className="mt-1 w-full" onClick={onViewAll}>
          View all {entries.length} record{entries.length === 1 ? '' : 's'}
          <ChevronRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
