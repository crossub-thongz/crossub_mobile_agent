import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { TaskStatusItem } from '@/lib/types';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<NonNullable<TaskStatusItem['tone']>, string> = {
  ok: 'text-primary',
  neutral: 'text-muted-foreground',
  warning: 'text-amber-400',
  urgent: 'text-destructive',
};

export function TaskStatusRow({
  item,
  asLink = true,
}: {
  item: TaskStatusItem;
  asLink?: boolean;
}) {
  const content = (
    <div className="flex items-start justify-between gap-2 p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
          {item.module}
        </p>
        <p className="truncate text-sm font-semibold">{item.propertyAddress}</p>
        <p className="text-sm leading-snug">{item.taskLabel}</p>
        <p
          className={cn(
            'text-xs font-medium',
            item.tone ? TONE_CLASS[item.tone] : 'text-primary',
          )}
        >
          {item.status}
        </p>
        {item.requiresApproval && (
          <p className="text-primary text-[10px] font-semibold uppercase">
            Action needed
          </p>
        )}
      </div>
      {asLink && <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />}
    </div>
  );

  if (!asLink) {
    return <div className="rounded-xl border bg-card">{content}</div>;
  }

  return (
    <Link
      href={item.href}
      className="block rounded-xl border bg-card active:bg-secondary/50"
    >
      {content}
    </Link>
  );
}
