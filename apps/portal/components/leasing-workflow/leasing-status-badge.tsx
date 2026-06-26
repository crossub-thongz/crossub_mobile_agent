import {
  LEASING_ITEM_STATUS_LABEL,
  LEASING_ITEM_STATUS_TONE,
  LEASING_TONE_CLASS,
  LEASING_TONE_DOT,
  type LeasingItemStatus,
  type LeasingTone,
} from '@/lib/leasing/constants';
import { cn } from '@/lib/utils';

type BadgeSize = 'xs' | 'sm';

function sizeClasses(size: BadgeSize): string {
  return size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
}

export function LeasingToneBadge({
  tone,
  label,
  size = 'sm',
  className,
}: {
  tone: LeasingTone;
  label: string;
  size?: BadgeSize;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        sizeClasses(size),
        LEASING_TONE_CLASS[tone],
        className,
      )}
    >
      <span className={cn('inline-flex size-1.5 shrink-0 rounded-full', LEASING_TONE_DOT[tone])} />
      {label}
    </span>
  );
}

export function LeasingStatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: LeasingItemStatus;
  size?: BadgeSize;
  className?: string;
}) {
  return (
    <LeasingToneBadge
      tone={LEASING_ITEM_STATUS_TONE[status]}
      label={LEASING_ITEM_STATUS_LABEL[status]}
      size={size}
      className={className}
    />
  );
}
