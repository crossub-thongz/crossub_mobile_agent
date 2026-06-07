import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export function NeedActionBadge({
  count,
  className,
  size = 'default',
}: {
  count?: number;
  className?: string;
  size?: 'default' | 'sm';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/15 font-bold text-destructive',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        className,
      )}
    >
      <AlertCircle className={cn('shrink-0', size === 'sm' ? 'size-2.5' : 'size-3')} />
      {count != null && count > 1 ? `${count} need action` : 'Need action'}
    </span>
  );
}
