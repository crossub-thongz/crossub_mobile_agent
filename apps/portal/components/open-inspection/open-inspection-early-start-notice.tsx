'use client';

import { Clock } from 'lucide-react';

import { formatOpenInspectionEarlyStartNotice } from '@/lib/leasing/open-inspection-display';

export function OpenInspectionEarlyStartNotice({
  startedEarly,
  startedEarlyAt,
  originalScheduledStart,
  finishedAt,
  scheduledEnd,
  className,
}: {
  startedEarly?: boolean;
  startedEarlyAt?: string;
  originalScheduledStart?: string;
  finishedAt?: string;
  scheduledEnd?: string;
  className?: string;
}) {
  const message = formatOpenInspectionEarlyStartNotice({
    startedEarly,
    startedEarlyAt,
    originalScheduledStart,
    finishedAt,
    scheduledEnd,
  });
  if (!message) return null;

  return (
    <p
      className={
        className ??
        'flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-50'
      }
    >
      <Clock className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
