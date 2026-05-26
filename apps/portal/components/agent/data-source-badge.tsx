import { cn } from '@/lib/utils';

export function DataSourceBadge({
  source,
  className,
}: {
  source?: 'api' | 'demo';
  className?: string;
}) {
  if (!source) return null;
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        source === 'api'
          ? 'bg-primary/15 text-primary'
          : 'bg-secondary text-muted-foreground',
        className,
      )}
    >
      {source === 'api' ? 'Live · crossub_web' : 'Demo'}
    </span>
  );
}
