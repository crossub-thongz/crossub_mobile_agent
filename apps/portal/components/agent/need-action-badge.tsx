import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export function NeedActionBadge({
  count,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive',
        className,
      )}
    >
      <AlertCircle className="size-3 shrink-0" />
      {count != null && count > 1 ? `${count} need action` : 'Need action'}
    </span>
  );
}
