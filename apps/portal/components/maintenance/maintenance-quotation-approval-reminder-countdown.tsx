'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

import {
  getQuotationApprovalReminderUiState,
  shouldStopQuotationApprovalReminderLoop,
} from '@/lib/maintenance/maintenance-quotation-approval-reminder.util';
import type {
  ApiMaintenanceRequest,
  ApiMaintenanceState,
  ApiQuotation,
} from '@/lib/crossub-api/types';
import { cn } from '@/lib/utils';

export function MaintenanceQuotationApprovalReminderCountdown({
  request,
  reminders,
  quotations,
  className,
  compact = false,
}: {
  request: ApiMaintenanceRequest;
  reminders: ApiMaintenanceState['maintenanceReminders'];
  quotations: ApiQuotation[];
  className?: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (request.status !== 'pending_approval' || request.responsibility !== 'landlord') {
    return null;
  }

  const requestQuotations = quotations.filter((q) => q.maintenanceRequestId === request.id);
  if (shouldStopQuotationApprovalReminderLoop(request, requestQuotations)) {
    return null;
  }

  const ui = getQuotationApprovalReminderUiState({
    request,
    reminders,
    quotations: requestQuotations,
    now,
  });

  const tone = ui.overdue ? 'text-destructive' : 'text-warning';

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 tabular-nums', tone, className)}>
        <Clock className="size-3 shrink-0" />
        {ui.remindersSent} sent · {ui.countdownLabel}
      </span>
    );
  }

  return (
    <p className={cn('text-[11px] tabular-nums', tone, className)}>
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3 shrink-0" />
        {ui.remindersSent} reminder{ui.remindersSent === 1 ? '' : 's'} sent
      </span>
      {' · '}
      Next reminder in {ui.countdownLabel}
      {' · '}
      every 3 hours until you approve
    </p>
  );
}
