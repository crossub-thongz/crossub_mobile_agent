import { cn } from '@/lib/utils';

export function MessageUnreadBadge({
  count,
  className,
  size = 'sm',
  variant = 'count',
}: {
  count: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Dot-only indicator (WeChat-style) or numbered badge. */
  variant?: 'count' | 'dot';
}) {
  if (count <= 0) return null;

  if (variant === 'dot') {
    return (
      <span
        className={cn(
          'bg-[#fa5151] absolute rounded-full ring-2 ring-background',
          size === 'sm' && 'size-2',
          size === 'md' && 'size-2.5',
          size === 'lg' && 'size-3',
          className,
        )}
        aria-label={`${count} unread message${count === 1 ? '' : 's'}`}
      />
    );
  }

  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-[#fa5151] font-bold text-white tabular-nums',
        size === 'sm' && 'min-h-[1.125rem] min-w-[1.125rem] px-1 text-[10px] leading-none',
        size === 'md' && 'min-h-[1.25rem] min-w-[1.25rem] px-1.5 text-[11px] leading-none',
        size === 'lg' && 'size-6 min-w-6 text-[11px] leading-none',
        className,
      )}
      aria-label={`${count} unread message${count === 1 ? '' : 's'}`}
    >
      {label}
    </span>
  );
}
