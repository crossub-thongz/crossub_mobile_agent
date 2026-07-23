'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

import {
  getContractorRfqReminderUiState,
  RFQ_MAX_REMINDERS_PER_CONTRACTOR,
  shouldStopRfqReminderLoop,
} from '@/lib/maintenance/maintenance-rfq-reminder.util';
import type {
  ApiMaintenanceRequest,
  ApiQuotation,
} from '@/lib/crossub-api/types';
import { cn } from '@/lib/utils';

type MaintenanceReminderRow = {
  id: string;
  maintenanceRequestId: string;
  status?: ApiMaintenanceRequest['status'];
  dueAt: string;
  sentAt?: string;
  type: 'reminder' | 'escalation';
  contractorId?: string;
  rfqRound?: number;
};

export function MaintenanceContractorRfqReminderCountdown({
  contractorId,
  request,
  reminders,
  quotations,
  className,
  compact = false,
}: {
  contractorId: string;
  request: ApiMaintenanceRequest;
  reminders: MaintenanceReminderRow[];
  quotations: ApiQuotation[];
  className?: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (request.status !== 'pending_quotation' || request.responsibility !== 'landlord') {
    return null;
  }

  const requestQuotations = quotations.filter((q) => q.maintenanceRequestId === request.id);
  if (shouldStopRfqReminderLoop(request, requestQuotations)) {
    return null;
  }

  const ui = getContractorRfqReminderUiState({
    contractorId,
    request,
    reminders,
    quotations: requestQuotations,
    now,
  });

  if (ui.responded) {
    return null;
  }

  const tone = ui.overdue
    ? 'text-destructive'
    : ui.remindersSent >= RFQ_MAX_REMINDERS_PER_CONTRACTOR
      ? 'text-muted-foreground'
      : 'text-amber-700 dark:text-amber-300';

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
      {ui.remindersSent < RFQ_MAX_REMINDERS_PER_CONTRACTOR ? (
        <>
          {' · '}
          Next reminder in {ui.countdownLabel}
          {' · '}
          every 4 hours
        </>
      ) : (
        <> · Max reminders sent — awaiting auto-reselect if no responses</>
      )}
    </p>
  );
}
