'use client';

import { useEffect, useState } from 'react';
import { Bell, FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RentReviewTenantRemindersDialog } from '@/components/rent-review/rent-review-tenant-reminders-dialog';
import { RentReviewTenantResponseOnBehalfPanel } from '@/components/rent-review/rent-review-tenant-response-on-behalf-panel';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
  canRecordTenantResponseOnBehalf,
  canSendTenantNotice,
  hasTenantNoticeSent,
} from '@/lib/rent-review/agent-workflow-model';
import { listTenantResponseReminders } from '@/lib/rent-review/tenant-reminders';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function RentReviewTenantNotifiedPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [remindersOpen, setRemindersOpen] = useState(false);

  useEffect(() => {
    setEffectiveDate(detail.effectiveDate ?? '');
  }, [detail]);

  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED);
  const noticeSent = hasTenantNoticeSent(detail);
  const showSendNotice = canSendTenantNotice(detail);
  const showRecordResponse = canRecordTenantResponseOnBehalf(detail);
  const reminders = listTenantResponseReminders(detail);
  const noticeAudit = [...detail.auditLog].reverse().find((e) => e.kind === 'tenant_notices_dispatched');

  const run = async (action: () => Promise<RentReviewWorkflowDetail>, success: string) => {
    setBusy(true);
    try {
      const updated = await runMutation(detail.id, action());
      onUpdated?.(updated);
      toast.success(success);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const downloadNotice = async () => {
    setBusy(true);
    try {
      const blob = await rentReviewApi.downloadNoticeOfRentIncrease(detail.id, {
        weekly: detail.proposedWeeklyRent ?? undefined,
        effectiveDate: effectiveDate || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notice-of-rent-increase-${detail.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Notice of Rent Increase downloaded');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Tenant notify</p>
        <p className="text-muted-foreground mb-3 text-xs">
          {noticeSent
            ? 'Confirmed terms have been sent to the tenant for acceptance. The system automatically sends a reminder email every 2 days until they respond.'
            : 'Send the formal notice with the agent-confirmed terms so the tenant can accept, counter, or decline.'}
        </p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Proposed rent</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent)}/wk
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rent increase on</dt>
            <dd className="font-medium">{detail.effectiveDate ?? 'Not set'}</dd>
          </div>
          {detail.preferredLeaseType ? (
            <div>
              <dt className="text-muted-foreground">Preferred renewal</dt>
              <dd className="font-medium capitalize">{detail.preferredLeaseType} term</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {noticeSent ? (
        <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
          <p className="text-sky-800 text-xs font-semibold uppercase dark:text-sky-300">Audit</p>
          <p className="mt-1 text-sm">
            Formal notice dispatched to tenant
            {noticeAudit ? ` on ${formatDateTime(noticeAudit.at)}` : ''}.
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {reminders.length > 0
              ? `${reminders.length} automated reminder${reminders.length === 1 ? '' : 's'} sent so far (every 2 days).`
              : 'No reminders sent yet — the first reminder is scheduled 2 days after dispatch if there is no response.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => setRemindersOpen(true)}
          >
            <Bell className="size-4" />
            View all reminder emails
          </Button>
        </section>
      ) : null}

      {showSendNotice ? (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-primary text-xs font-semibold uppercase">Send tenant notice</p>
          <p className="text-muted-foreground text-xs">
            Dispatch the formal increase notice on behalf of the tenant communication channel (email,
            post, or hand delivery).
          </p>
          <Label htmlFor="notice-effective">Rent increase on</Label>
          <Input
            id="notice-effective"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={busy}
            onClick={() =>
              void run(
                () =>
                  rentReviewApi.sendTenantNotice(detail.id, {
                    weekly: detail.proposedWeeklyRent ?? undefined,
                    effectiveDate: effectiveDate || undefined,
                  }),
                'Tenant notice sent',
              )
            }
          >
            Send formal notice to tenant
          </Button>
        </div>
      ) : null}

      {showRecordResponse ? (
        <RentReviewTenantResponseOnBehalfPanel detail={detail} onUpdated={onUpdated} />
      ) : null}

      <Button variant="outline" className="w-full gap-2" disabled={busy} onClick={() => void downloadNotice()}>
        <FileDown className="size-4" />
        Download NSW Notice of Rent Increase PDF
      </Button>

      {auditEntries.length > 0 ? (
        <section className="rounded-xl border bg-muted/20 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide">Activity</p>
          <ul className="space-y-1 text-xs">
            {auditEntries.map((e) => (
              <li key={e.id}>
                <span className="text-muted-foreground">{formatDateTime(e.at)} · </span>
                <span className="font-medium">{e.message}</span>
                {e.detail ? <span className="text-muted-foreground"> · {e.detail}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RentReviewTenantRemindersDialog
        detail={detail}
        open={remindersOpen}
        onOpenChange={setRemindersOpen}
      />
    </div>
  );
}
