'use client';

import { useState } from 'react';
import { Link2, Mail, MessageSquare, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { InfoPanel } from '@/components/agent/info-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const DEFAULT_RECEIPT_TEMPLATE = `Dear {{tenant_name}},

We acknowledge receipt of {{amount}} for {{property_address}} (Ref {{reference_code}}) on {{payment_date}}.

Payment type: {{payment_type}}

Thank you,
{{agent_name}} via CROSSUB`;

const DEFAULT_EMAIL_REMINDER = `Dear {{tenant_name}}, your rent of {{amount}} for {{property_address}} is {{days}} days overdue. Please arrange payment or upload proof via the tenant app.`;

const DEFAULT_SMS_REMINDER =
  'CROSSUB: Rent {{amount}} for {{property_address}} is {{days}} days overdue. Reply or pay via tenant app.';

export function AccountingSettingsSection() {
  const [bankFeedLinked] = useState(false);
  const [reminderDays, setReminderDays] = useState('3');
  const [reminderMethods, setReminderMethods] = useState({
    email: true,
    sms: true,
    phone: false,
  });
  const [receiptTemplate, setReceiptTemplate] = useState(DEFAULT_RECEIPT_TEMPLATE);
  const [emailReminder, setEmailReminder] = useState(DEFAULT_EMAIL_REMINDER);
  const [smsReminder, setSmsReminder] = useState(DEFAULT_SMS_REMINDER);

  return (
    <div className="space-y-4">
      <InfoPanel title="Bank feed link" icon={Link2}>
        <p className="text-muted-foreground text-sm">
          Sync with the bank so agents do not need to upload statements manually. Connect when
          available.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
            {bankFeedLinked ? 'Connected' : 'Not connected'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            onClick={() => toast.info('Bank feed integration will be available in a future release')}
          >
            <Link2 className="mr-1.5 size-4" />
            Connect bank feed
          </Button>
        </div>
      </InfoPanel>

      <InfoPanel title="Receipt content setup" icon={Settings}>
        <p className="text-muted-foreground text-sm">
          Template sent to tenants when rent or invoice payments are received.
        </p>
        <div className="mt-3 space-y-2">
          <Label htmlFor="receipt-template">Payment receipt template</Label>
          <Textarea
            id="receipt-template"
            className="min-h-36 font-mono text-xs"
            value={receiptTemplate}
            onChange={(e) => setReceiptTemplate(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => toast.success('Receipt template saved')}
          >
            Save template
          </Button>
        </div>
      </InfoPanel>

      <InfoPanel title="Rent reminder schedule" icon={Mail}>
        <p className="text-muted-foreground text-sm">
          Reminders begin after the overdue threshold, then repeat on a fixed interval until paid.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reminder-days">Start after (days overdue)</Label>
            <Input
              id="reminder-days"
              type="number"
              min={1}
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <Label>Reminder methods</Label>
            {(
              [
                ['email', 'Email', Mail],
                ['sms', 'SMS', MessageSquare],
                ['phone', 'Phone call', MessageSquare],
              ] as const
            ).map(([key, label, Icon]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reminderMethods[key]}
                  onChange={(e) =>
                    setReminderMethods((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="rounded border-border"
                />
                <Icon className="text-muted-foreground size-4" />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-reminder">Email reminder content</Label>
            <Textarea
              id="email-reminder"
              className="min-h-24 text-xs"
              value={emailReminder}
              onChange={(e) => setEmailReminder(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sms-reminder">SMS reminder content</Label>
            <Textarea
              id="sms-reminder"
              className="min-h-16 text-xs"
              value={smsReminder}
              onChange={(e) => setSmsReminder(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => toast.success('Reminder schedule saved')}
          >
            Save reminder schedule
          </Button>
        </div>
      </InfoPanel>
    </div>
  );
}
