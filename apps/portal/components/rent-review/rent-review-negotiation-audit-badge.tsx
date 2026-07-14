'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Clock } from 'lucide-react';

import { canResolveNegotiation } from '@/lib/rent-review/agent-workflow-model';
import { resolveTenantReminderSchedule } from '@/lib/rent-review/tenant-reminders';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { cn } from '@/lib/utils';

function reminderCountdownTone(msRemaining: number): 'ok' | 'warning' | 'urgent' | 'overdue' {
  if (msRemaining <= 0) return 'overdue';
  if (msRemaining < 60 * 60 * 1000) return 'urgent';
  if (msRemaining < 24 * 60 * 60 * 1000) return 'warning';
  return 'ok';
}

const TONE_CLASS = {
  ok: 'border-primary/25 bg-primary/10 text-primary',
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  urgent: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  overdue: 'border-destructive/35 bg-destructive/10 text-destructive',
  pending: 'border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  action: 'border-primary/35 bg-primary/10 text-primary',
} as const;

export function RentReviewNegotiationAuditBadge({
  detail,
  readOnly,
}: {
  detail: RentReviewWorkflowDetail;
  readOnly?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const schedule = useMemo(() => resolveTenantReminderSchedule(detail, now), [detail, now]);
  const pending = canResolveNegotiation(detail);

  if (schedule.active) {
    const tone = reminderCountdownTone(schedule.msRemaining);
    const label =
      schedule.msRemaining <= 0
        ? 'Reminder due now'
        : `Next reminder ${schedule.countdownLabel}`;
    return (
      <span
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

  if (pending && readOnly) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
          TONE_CLASS.pending,
        )}
      >
        <Clock className="size-3.5" aria-hidden />
        Awaiting property manager review
      </span>
    );
  }

  if (pending && !readOnly) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
          TONE_CLASS.action,
        )}
      >
        <Clock className="size-3.5" aria-hidden />
        Action required
      </span>
    );
  }

  return null;
}
