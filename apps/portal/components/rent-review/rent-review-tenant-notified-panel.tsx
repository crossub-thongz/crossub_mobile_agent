'use client';

import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RentReviewEmailLog } from '@/components/rent-review/rent-review-email-log';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
  buildTenantNoticeEmail,
  emailRecordsFromAudit,
} from '@/lib/rent-review/agent-workflow-model';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency } from '@/lib/utils';

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

  useEffect(() => {
    setEffectiveDate(detail.effectiveDate ?? '');
  }, [detail]);

  const noticeEmail = buildTenantNoticeEmail(detail);
  const reminderEmails = emailRecordsFromAudit(detail).filter(
    (e) => e.kind === 'tenant_response_reminder',
  );
  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED);

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
        <p className="mb-2 text-sm font-semibold">Tenant notified</p>
        <p className="text-muted-foreground mb-3 text-xs">
          Formal rent increase notice sent to tenant. If no reply, the system sends a reminder
          email every 3 days.
        </p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Proposed rent</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent)}/wk
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Effective date</dt>
            <dd className="font-medium">{detail.effectiveDate ?? 'Not set'}</dd>
          </div>
        </dl>
      </section>

      {noticeEmail ? (
        <RentReviewEmailLog title="Notice email to tenant" emails={[noticeEmail]} />
      ) : null}

      {reminderEmails.length > 0 ? (
        <RentReviewEmailLog title="Reminder emails (every 3 days)" emails={reminderEmails} />
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-3 text-xs">
          No tenant reply yet — automatic reminders will be sent every 3 days.
        </p>
      )}

      {detail.workflowState === 'agent_review' && detail.proposedWeeklyRent != null ? (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-primary text-xs font-semibold uppercase">Send tenant notice</p>
          <Label htmlFor="notice-effective">Effective date</Label>
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
                <span className="font-medium">{e.message}</span>
                {e.detail ? <span className="text-muted-foreground"> · {e.detail}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
