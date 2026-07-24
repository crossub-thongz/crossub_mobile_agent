'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, Clock, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmailPreviewParties } from '@/components/agent/email-preview-parties';
import {
  buildTenantReminderListItems,
  resolveTenantReminderSchedule,
  RENT_REVIEW_TENANT_REMINDER_DAYS,
  type TenantReminderEmail,
} from '@/lib/rent-review/tenant-reminders';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { cn, formatDateTime } from '@/lib/utils';

function ReminderListRow({
  reminder,
  countdownLabel,
  onSelect,
}: {
  reminder: TenantReminderEmail;
  countdownLabel?: string;
  onSelect: () => void;
}) {
  const upcoming = reminder.upcoming === true;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'hover:bg-muted/30 flex w-full items-start gap-3 px-3 py-3 text-left transition-colors',
        upcoming && 'border-t border-dashed bg-amber-500/5',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
          upcoming ? 'bg-amber-500/20 text-amber-800' : 'bg-amber-500/15 text-amber-700',
        )}
      >
        {upcoming ? <Clock className="size-4" /> : <Bell className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {upcoming ? `Upcoming reminder ${reminder.index}` : reminder.subject}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {upcoming ? (
            <>
              Scheduled · next send {countdownLabel ?? 'soon'}
              {reminder.scheduledAt ? ` · ${formatDateTime(reminder.scheduledAt)}` : ''}
            </>
          ) : (
            <>
              Reminder {reminder.index} · sent {formatDateTime(reminder.entry.at)}
            </>
          )}
        </p>
      </div>
      <ChevronRight className="text-muted-foreground mt-2 size-4 shrink-0" />
    </button>
  );
}

function ReminderEmailPreview({
  reminder,
  detail,
}: {
  reminder: TenantReminderEmail;
  detail: RentReviewWorkflowDetail;
}) {
  const upcoming = reminder.upcoming === true;
  const contacts = [{ role: 'Tenant', name: detail.tenantName, email: 'tenant@example.com' }];

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-2">
        <Mail className="text-primary mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium leading-snug">{reminder.subject}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {upcoming ? 'Scheduled automated reminder' : `Sent ${formatDateTime(reminder.entry.at)}`}
          </p>
        </div>
      </div>
      <EmailPreviewParties
        from={reminder.from}
        to={reminder.to}
        contacts={contacts}
      />
      <div className="rounded-xl border bg-muted/20 p-3">
        <pre className="text-foreground/90 whitespace-pre-wrap font-sans text-xs leading-relaxed">
          {reminder.body}
        </pre>
      </div>
    </div>
  );
}

function ReminderCountdownBanner({
  schedule,
}: {
  schedule: ReturnType<typeof resolveTenantReminderSchedule>;
}) {
  if (!schedule.active) return null;

  return (
    <div className="border-b bg-amber-500/10 px-4 py-3">
      <div className="flex items-start gap-2">
        <Clock className="mt-0.5 size-4 shrink-0 text-amber-800 dark:text-amber-300" />
        <div className="min-w-0 text-xs">
          <p className="font-semibold text-amber-950 dark:text-amber-100">
            Next automated reminder {schedule.countdownLabel}
          </p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            The system automatically sends an email to urge the tenant every{' '}
            {RENT_REVIEW_TENANT_REMINDER_DAYS} days until they respond. Click any reminder below
            to preview the email.
          </p>
          {schedule.nextDueAt ? (
            <p className="text-muted-foreground mt-1 tabular-nums">
              Scheduled for {formatDateTime(schedule.nextDueAt)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RentReviewTenantRemindersDialog({
  detail,
  open,
  onOpenChange,
}: {
  detail: RentReviewWorkflowDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<TenantReminderEmail | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [open]);

  const schedule = useMemo(() => resolveTenantReminderSchedule(detail, now), [detail, now]);
  const reminders = useMemo(() => buildTenantReminderListItems(detail, now), [detail, now]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelected(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent elevated className="max-h-[85vh] max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-base">
            {selected
              ? selected.upcoming
                ? `Upcoming reminder ${selected.index}`
                : `Reminder ${selected.index}`
              : 'Tenant reminder emails'}
          </DialogTitle>
        </DialogHeader>

        {selected ? (
          <div className="flex max-h-[calc(85vh-8rem)] flex-col overflow-hidden">
            <div className="border-b px-4 py-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                ← All reminders
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <ReminderEmailPreview reminder={selected} detail={detail} />
            </div>
          </div>
        ) : (
          <>
            <ReminderCountdownBanner schedule={schedule} />
            {reminders.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-sm">
                No reminder emails yet. After the formal notice is dispatched, the first automated
                reminder is scheduled {RENT_REVIEW_TENANT_REMINDER_DAYS} days later if the tenant
                has not responded.
              </p>
            ) : (
              <div className="max-h-[calc(85vh-10rem)] overflow-y-auto divide-y">
                {reminders.map((reminder) => (
                  <ReminderListRow
                    key={reminder.upcoming ? `upcoming-${reminder.index}` : reminder.entry.id}
                    reminder={reminder}
                    countdownLabel={reminder.upcoming ? schedule.countdownLabel : undefined}
                    onSelect={() => setSelected(reminder)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
