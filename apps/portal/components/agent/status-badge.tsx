import type { Priority } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRIORITY: Record<
  Priority,
  { label: string; className: string }
> = {
  urgent: {
    label: 'Urgent',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
  high: {
    label: 'High',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  normal: {
    label: 'Normal',
    className: 'bg-secondary text-muted-foreground border-border',
  },
  low: {
    label: 'Low',
    className: 'bg-secondary text-muted-foreground border-border',
  },
};

export function StatusBadge({
  label,
  priority,
  variant = 'default',
  className,
}: {
  label: string;
  priority?: Priority;
  variant?: 'default' | 'approval' | 'success' | 'warning';
  className?: string;
}) {
  const styles =
    variant === 'approval'
      ? 'bg-primary/15 text-primary border-primary/30'
      : variant === 'success'
        ? 'bg-primary/10 text-primary border-primary/20'
        : variant === 'warning'
          ? 'bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200'
          : priority
            ? PRIORITY[priority].className
            : 'bg-secondary text-muted-foreground border-border';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase',
        styles,
        className,
      )}
    >
      {label}
    </span>
  );
}
