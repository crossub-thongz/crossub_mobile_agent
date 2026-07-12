'use client';

import { useMemo, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  buildAllTenantReminderEmails,
  type TenantReminderEmail,
} from '@/lib/rent-review/tenant-reminders';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { formatDateTime } from '@/lib/utils';

function ReminderListRow({
  reminder,
  onSelect,
}: {
  reminder: TenantReminderEmail;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="hover:bg-muted/30 flex w-full items-start gap-3 px-3 py-3 text-left transition-colors"
    >
      <span className="bg-amber-500/15 text-amber-700 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
        <Bell className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{reminder.subject}</p>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          Reminder {reminder.index} · {formatDateTime(reminder.entry.at)}
        </p>
      </div>
      <ChevronRight className="text-muted-foreground mt-2 size-4 shrink-0" />
    </button>
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
  const reminders = useMemo(() => buildAllTenantReminderEmails(detail), [detail]);
  const [selected, setSelected] = useState<TenantReminderEmail | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelected(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-base">
            {selected ? `Reminder ${selected.index}` : 'Tenant reminder emails'}
          </DialogTitle>
        </DialogHeader>

        {selected ? (
          <div className="flex max-h-[calc(85vh-8rem)] flex-col overflow-hidden">
            <div className="border-b px-4 py-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                ← All reminders
              </Button>
              <p className="text-muted-foreground mt-1 text-xs">
                Sent {formatDateTime(selected.entry.at)} · automated system reminder
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="mb-2 text-sm font-medium">{selected.subject}</p>
              <pre className="text-muted-foreground whitespace-pre-wrap font-sans text-xs leading-relaxed">
                {selected.body}
              </pre>
            </div>
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            No automated reminders have been sent yet. The system sends a reminder every 2 days
            after the formal notice is dispatched if the tenant has not responded.
          </p>
        ) : (
          <div className="max-h-[calc(85vh-8rem)] overflow-y-auto divide-y">
            {reminders.map((reminder) => (
              <ReminderListRow
                key={reminder.entry.id}
                reminder={reminder}
                onSelect={() => setSelected(reminder)}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
