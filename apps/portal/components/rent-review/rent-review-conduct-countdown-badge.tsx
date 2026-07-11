'use client';

import { AlarmClock, Check } from 'lucide-react';

import type { RentReviewConductCountdownTone } from '@/lib/rent-review/conduct-countdown';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<RentReviewConductCountdownTone, string> = {
  ok: 'border-primary/25 bg-primary/10 text-primary',
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  urgent: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  overdue: 'border-destructive/35 bg-destructive/10 text-destructive',
  notice_sent: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  complete: 'border-border bg-muted/40 text-muted-foreground',
};

export function RentReviewConductCountdownBadge({
  label,
  title,
  tone,
  compact = false,
}: {
  label: string;
  title: string;
  tone: RentReviewConductCountdownTone;
  compact?: boolean;
}) {
  const Icon = tone === 'notice_sent' || tone === 'complete' ? Check : AlarmClock;

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold tabular-nums',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        TONE_CLASS[tone],
      )}
    >
      <Icon className={compact ? 'size-3' : 'size-3.5'} aria-hidden />
      {label}
    </span>
  );
}
