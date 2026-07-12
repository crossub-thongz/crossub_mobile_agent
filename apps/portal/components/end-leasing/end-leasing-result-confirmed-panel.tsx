'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { communicationsThread } from '@/constants/routes';
import { EndLeasingReportComparisonPanel } from '@/components/end-leasing/end-leasing-report-comparison-panel';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { terminationApi } from '@/lib/termination-case-api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function EmailSentCard({
  title,
  email,
}: {
  title: string;
  email: NonNullable<TerminationCaseDetail['reportComparison']['tenantRepairQuoteEmail']>;
}) {
  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{title}</p>
        {email.commConversationId ? (
          <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-[10px]">
            <Link href={communicationsThread(email.commConversationId)}>
              <ExternalLink className="size-3" />
              Message Center
            </Link>
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground">
        To: {email.to} · {email.sentAt ? formatDateTime(email.sentAt) : 'Sent'}
      </p>
    </div>
  );
}

export function EndLeasingResultConfirmedPanel({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const [busy, setBusy] = useState(false);
  const [tenantNotice, setTenantNotice] = useState(
    caseData.reportComparison.tenantQuoteDeclineReason ?? '',
  );

  const rc = caseData.reportComparison;
  const agentQuoteEmail = rc.agentRepairQuoteEmail ?? rc.landlordRepairQuoteEmail;
  const agentConfirmed = Boolean(rc.agentQuoteConfirmed);
  const tenantItems = rc.tenantResponsibility;
  const tenantTotal = useMemo(
    () =>
      tenantItems.reduce((sum, item) => {
        const raw = item.quote?.replace(/[^0-9.]/g, '') ?? '';
        const n = Number(raw);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [tenantItems],
  );

  const run = async (action: () => Promise<TerminationCaseDetail>, success: string) => {
    setBusy(true);
    try {
      const updated = await action();
      applyCase(updated);
      toast.success(success);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const recordTenantOwnQuote = async () => {
    if (!tenantNotice.trim()) {
      toast.error('Enter a notice explaining the tenant-acknowledged price');
      return;
    }
    await run(
      () => terminationApi.declineTenantRepairQuote(caseData.id, tenantNotice.trim()),
      'Tenant-acknowledged price recorded with notice',
    );
  };

  return (
    <div className="space-y-4">
      {agentQuoteEmail?.body ? (
        <EmailSentCard title="Repair quotes sent to agent" email={agentQuoteEmail} />
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
          Complete the Quote step and send repair quotes to the agent first.
        </p>
      )}

      <section className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Agent confirms figures</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Review landlord and tenant quote totals, then confirm before sending the tenant portion.
        </p>
        {agentConfirmed ? (
          <p className="text-primary mt-3 flex items-center gap-2 text-xs font-medium">
            <Check className="size-4" />
            Confirmed
            {rc.agentQuoteConfirmedAt
              ? ` · ${formatDateTime(rc.agentQuoteConfirmedAt)}`
              : ''}
          </p>
        ) : (
          <Button
            type="button"
            size="sm"
            className="mt-3 h-8 text-xs"
            disabled={busy || !agentQuoteEmail?.sentAt}
            onClick={() => void run(() => terminationApi.confirmAgentQuote(caseData.id), 'Figures confirmed')}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Confirm figures
          </Button>
        )}
      </section>

      {agentConfirmed ? (
        <>
          <section className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">Tenant acknowledged price</p>
            <p className="text-muted-foreground mt-1 text-xs">
              The tenant may accept the quoted repair amount or provide their own price from another
              provider. Record their acknowledged figure and a notice explaining the basis.
            </p>
            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Quoted tenant total</dt>
                <dd className="font-semibold tabular-nums">{formatCurrency(tenantTotal)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tenant response</dt>
                <dd className="font-medium">
                  {rc.tenantQuoteResponse === 'accepted'
                    ? 'Accepted quoted price'
                    : rc.tenantQuoteResponse === 'declined'
                      ? 'Own price / disputed'
                      : 'Pending'}
                </dd>
              </div>
            </dl>
            <div className="mt-3 space-y-2">
              <Label htmlFor={`tenant-notice-${caseData.id}`}>Notice / reason</Label>
              <Textarea
                id={`tenant-notice-${caseData.id}`}
                className="min-h-[5rem] text-xs leading-relaxed"
                placeholder="e.g. Tenant obtained a lower quote from their own cleaner and accepts $X instead."
                value={tenantNotice}
                disabled={busy || rc.tenantQuoteResponse === 'accepted'}
                onChange={(e) => setTenantNotice(e.target.value)}
              />
            </div>
            {rc.tenantQuoteResponse !== 'accepted' ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => terminationApi.acceptTenantRepairQuote(caseData.id),
                      'Tenant accepted quoted price',
                    )
                  }
                >
                  Tenant accepts quoted price
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={busy}
                  onClick={() => void recordTenantOwnQuote()}
                >
                  Record tenant own price
                </Button>
              </div>
            ) : null}
          </section>

          {rc.tenantRepairQuoteEmail?.body ? (
            <EmailSentCard title="Tenant portion sent to tenant" email={rc.tenantRepairQuoteEmail} />
          ) : (
            <section className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold">Send tenant portion</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Email tenant responsibility items and quotes to the tenant only.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3 h-8 gap-1.5 text-xs"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => terminationApi.sendRepairQuoteEmail(caseData.id, 'tenant'),
                    'Tenant portion sent',
                  )
                }
              >
                <Send className="size-3.5" />
                Send tenant portion to tenant
              </Button>
            </section>
          )}

          <section className="rounded-xl border bg-muted/20 p-4">
            <p className="mb-2 text-sm font-semibold">Tenant responsibility</p>
            <p className="text-muted-foreground mb-3 text-xs">
              Synced from the inspector outgoing report — read only.
            </p>
            <EndLeasingReportComparisonPanel caseData={caseData} mode="tenant-response" />
          </section>
        </>
      ) : null}
    </div>
  );
}
