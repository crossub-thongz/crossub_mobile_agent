'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';

import { resolveTenantReminderSchedule } from '@/lib/rent-review/tenant-reminders';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { cn, formatDateTime } from '@/lib/utils';

type ReminderCountdownTone = 'ok' | 'warning' | 'urgent' | 'overdue';

function reminderCountdownTone(msRemaining: number): ReminderCountdownTone {
  if (msRemaining <= 0) return 'overdue';
  if (msRemaining < 60 * 60 * 1000) return 'urgent';
  if (msRemaining < 24 * 60 * 60 * 1000) return 'warning';
  return 'ok';
}

const TONE_CLASS: Record<ReminderCountdownTone, string> = {
  ok: 'border-primary/25 bg-primary/10 text-primary',
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  urgent: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  overdue: 'border-destructive/35 bg-destructive/10 text-destructive',
};

export function RentReviewTenantReminderCountdownBadge({
  detail,
}: {
  detail: RentReviewWorkflowDetail;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const schedule = useMemo(() => resolveTenantReminderSchedule(detail, now), [detail, now]);

  if (!schedule.active) return null;

  const tone = reminderCountdownTone(schedule.msRemaining);
  const label =
    schedule.msRemaining <= 0
      ? 'Reminder due now'
      : `Next reminder ${schedule.countdownLabel}`;
  const title = schedule.nextDueAt
    ? `Automated tenant reminder scheduled for ${formatDateTime(schedule.nextDueAt)}`
    : 'Automated tenant reminder pending';

  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums',
        TONE_CLASS[tone],
      )}
    >
      <Bell className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
