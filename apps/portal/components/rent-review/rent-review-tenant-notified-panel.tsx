'use client';

import { useEffect, useState } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RentReviewTenantReminderCountdownBadge } from '@/components/rent-review/rent-review-tenant-reminder-countdown-badge';
import { RentReviewTenantRemindersDialog } from '@/components/rent-review/rent-review-tenant-reminders-dialog';
import { RentReviewTenantNoticeTermsSummary } from '@/components/rent-review/rent-review-tenant-notice-terms-summary';
import { RentReviewTenantPortalResponseCard } from '@/components/rent-review/rent-review-tenant-portal-response-card';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
  canResendTenantNotice,
  canSendTenantNotice,
  hasTenantNoticeSent,
} from '@/lib/rent-review/agent-workflow-model';
import { formatRentReviewAuditDetail } from '@/lib/rent-review/audit-detail-display';
import {
  earliestCompliantRentIncreaseDate,
  RENT_REVIEW_STATUTORY_NOTICE_DAYS,
} from '@/lib/rent-review/scheduling';
import { listTenantResponseReminders } from '@/lib/rent-review/tenant-reminders';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn, formatDateTime } from '@/lib/utils';

export function RentReviewTenantNotifiedPanel({
  detail,
  onUpdated,
  readOnly,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
  readOnly?: boolean;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);

  useEffect(() => {
    setEffectiveDate(detail.effectiveDate ?? '');
  }, [detail]);

  // This button serves the notice, so the statutory count starts tomorrow.
  const earliestIncreaseDate = earliestCompliantRentIncreaseDate();
  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED);
  const noticeSent = hasTenantNoticeSent(detail);
  const showSendNotice = canSendTenantNotice(detail);
  const resendNotice = canResendTenantNotice(detail);
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
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notice-of-rent-increase-${detail.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Notice of rent increase downloaded');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-4 text-sm font-semibold">Tenant notified</p>
        <RentReviewTenantNoticeTermsSummary
          detail={detail}
          effectiveDateOverride={showSendNotice ? effectiveDate : undefined}
          noticeSentAt={noticeAudit?.at}
          onDownloadNotice={() => void downloadNotice()}
          downloadBusy={busy}
        />
      </section>

      {showSendNotice && !readOnly ? (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-primary text-xs font-semibold uppercase">
            {resendNotice ? 'Re-send tenant notice' : 'Send tenant notice'}
          </p>
          <p className="text-muted-foreground text-xs">
            {resendNotice
              ? 'The counter-offer exceeds the original formal notice amount. Re-send the NSW notice with the updated rent before the tenant can respond.'
              : 'Dispatch the formal increase notice with the agent-confirmed terms so the tenant can accept, counter, or decline.'}
          </p>
          {detail.rentNegotiable === false ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-100">
              Rent is marked non-negotiable — the tenant can accept or decline only.
            </p>
          ) : null}
          <Label htmlFor="notice-effective">Rent increase on</Label>
          <Input
            id="notice-effective"
            type="date"
            value={effectiveDate}
            min={earliestIncreaseDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Earliest {earliestIncreaseDate} — {RENT_REVIEW_STATUTORY_NOTICE_DAYS} days notice
            counted from the day after this notice is served. Re-sending serves a new notice, so
            the count starts again from today.
          </p>
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
            {resendNotice ? 'Re-send formal notice to tenant' : 'Send formal notice to tenant'}
          </Button>
        </div>
      ) : noticeSent ? (
        <p className="text-muted-foreground text-xs">
          Confirmed terms have been sent to the tenant. The system automatically sends a reminder
          email every 2 days until they respond.
        </p>
      ) : null}

      {auditEntries.length > 0 ? (
        <section className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => setAuditExpanded((open) => !open)}
              className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left"
              aria-expanded={auditExpanded}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">Audit</p>
                <p className="text-muted-foreground text-xs">
                  {auditEntries.length} event{auditEntries.length === 1 ? '' : 's'} ·{' '}
                  {auditExpanded ? 'Click to collapse' : 'Click to expand'}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'text-muted-foreground mt-0.5 size-5 shrink-0 transition-transform',
                  auditExpanded && 'rotate-180',
                )}
              />
            </button>
            {noticeSent ? <RentReviewTenantReminderCountdownBadge detail={detail} /> : null}
          </div>
          {auditExpanded ? (
            <ul className="mt-3 space-y-2 text-xs">
              {auditEntries.map((e) => {
                const auditDetail = formatRentReviewAuditDetail(e);
                return (
                  <li
                    key={e.id}
                    className="rounded-lg border border-border/60 bg-background px-3 py-2.5"
                  >
                    <p className="text-muted-foreground tabular-nums">{formatDateTime(e.at)}</p>
                    <p className="mt-0.5 font-medium">{e.message}</p>
                    {auditDetail ? (
                      <p className="text-muted-foreground mt-0.5">{auditDetail}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {noticeSent ? (
            <div className="mt-3 space-y-2">
              <p className="text-muted-foreground text-xs">
                {reminders.length > 0
                  ? `${reminders.length} automated reminder${reminders.length === 1 ? '' : 's'} sent so far (every 2 days).`
                  : 'No reminders sent yet — the first reminder is scheduled 2 days after dispatch if there is no response.'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setRemindersOpen(true)}
              >
                <Bell className="size-4" />
                View all reminder emails
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {noticeSent ? <RentReviewTenantPortalResponseCard detail={detail} /> : null}

      {/* Record tenant response — tenants respond via the tenant portal instead.
      {showRecordResponse && !readOnly ? (
        <RentReviewTenantResponseOnBehalfPanel detail={detail} onUpdated={onUpdated} />
      ) : null}
      */}

      <RentReviewTenantRemindersDialog
        detail={detail}
        open={remindersOpen}
        onOpenChange={setRemindersOpen}
      />
    </div>
  );
}
