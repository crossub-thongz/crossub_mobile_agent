import { cn } from '@/lib/utils';

export function MessageUnreadBadge({
  count,
  className,
  size = 'sm',
}: {
  count: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (count <= 0) return null;

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
