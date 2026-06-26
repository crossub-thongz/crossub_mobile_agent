import { Building2, Shield, User } from 'lucide-react';

import { cn } from '@/lib/utils';

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    critical: 'border-destructive/50 bg-destructive/10 text-destructive',
    high: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    medium: 'border-primary/40 bg-primary/5 text-primary',
    low: 'border-border bg-muted/40 text-muted-foreground',
  };

  const display = priority === 'critical' ? 'URGENT' : priority.toUpperCase();

  return (
    <span
      className={cn(
        'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        map[priority] ?? map.low,
      )}
    >
      {display}
    </span>
  );
}

export function ResponsibilityBadge({ responsibility }: { responsibility?: string | null }) {
  if (!responsibility) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const map: Record<string, { icon: typeof User; cls: string }> = {
    tenant: { icon: User, cls: 'text-amber-600 dark:text-amber-400' },
    landlord: { icon: Building2, cls: 'text-primary' },
    strata: { icon: Shield, cls: 'text-sky-600 dark:text-sky-400' },
  };

  const cfg = map[responsibility] ?? map.tenant;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium capitalize', cfg.cls)}>
      <Icon className="size-3" />
      {responsibility}
    </span>
  );
}
