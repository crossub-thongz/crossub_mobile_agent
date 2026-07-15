'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { JobCaseSentEmailPreviewCard } from '@/components/agent/job-case-email-log';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EndLeasingReportComparisonPanel } from '@/components/end-leasing/end-leasing-report-comparison-panel';
import { endLeasingStoredEmailToRecord } from '@/lib/end-leasing/agent-workflow-model';
import type { EndLeasingOverviewEmail, TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { terminationApi } from '@/lib/termination-case-api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function RepairQuoteSentCard({
  title,
  email,
  recordId,
  fallbackSubject,
  fallbackAt,
  kind,
}: {
  title: string;
  email: EndLeasingOverviewEmail;
  recordId: string;
  fallbackSubject: string;
  fallbackAt: string;
  kind: string;
}) {
  const record = useMemo(
    () => endLeasingStoredEmailToRecord(recordId, email, kind, fallbackSubject, fallbackAt),
    [email, recordId, kind, fallbackSubject, fallbackAt],
  );

  if (!record) return null;

  return <JobCaseSentEmailPreviewCard title={title} record={record} />;
}

export function EndLeasingResultConfirmedPanel({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const [busy, setBusy] = useState(false);
  const [tenantAcknowledgedPrice, setTenantAcknowledgedPrice] = useState(
    caseData.reportComparison.tenantAcknowledgedPrice ?? '',
  );
  const [tenantNotice, setTenantNotice] = useState(
    caseData.reportComparison.tenantQuoteDeclineReason ?? '',
  );

  const rc = caseData.reportComparison;
  const agentQuoteEmail = rc.agentRepairQuoteEmail ?? rc.landlordRepairQuoteEmail;
  const agentQuoteRecordId = rc.agentRepairQuoteEmail
    ? `${caseData.id}-agent-repair-quote`
    : `${caseData.id}-landlord-repair-quote`;
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

  const recordTenantOwnPrice = async () => {
    const price = tenantAcknowledgedPrice.trim();
    const notice = tenantNotice.trim();
    if (!price) {
      toast.error('Enter the tenant-acknowledged price');
      return;
    }
    if (!notice) {
      toast.error('Enter a notice explaining the tenant-acknowledged price');
      return;
    }
    await run(
      () =>
        terminationApi.declineTenantRepairQuote(caseData.id, {
          acknowledgedPrice: price,
          reason: notice,
        }),
      'Tenant-acknowledged price recorded with notice',
    );
  };

  return (
    <div className="space-y-4">
      {agentQuoteEmail?.body ? (
        <RepairQuoteSentCard
          title="Repair quotes sent to agent"
          email={agentQuoteEmail}
          recordId={agentQuoteRecordId}
          kind="agent_repair_quote"
          fallbackSubject="Repair quotes for agent"
          fallbackAt={caseData.createdAt}
        />
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
          Complete the Quote step and send repair quotes to the agent first.
        </p>
      )}

      <section className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Agent confirms figures</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Review landlord and tenant quote totals, then confirm before recording tenant response.
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
              The tenant may accept the quoted repair total or provide their own price from another
              provider. Record the acknowledged amount and a notice explaining the basis.
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
              {rc.tenantAcknowledgedPrice ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Tenant acknowledged price</dt>
                  <dd className="font-semibold tabular-nums">{rc.tenantAcknowledgedPrice}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`tenant-price-${caseData.id}`}>Tenant acknowledged price</Label>
                <Input
                  id={`tenant-price-${caseData.id}`}
                  className="h-9 text-xs"
                  placeholder="e.g. 420"
                  value={tenantAcknowledgedPrice}
                  disabled={busy || rc.tenantQuoteResponse === 'accepted'}
                  onChange={(e) => setTenantAcknowledgedPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor={`tenant-notice-${caseData.id}`}>Notice / reason</Label>
                <Textarea
                  id={`tenant-notice-${caseData.id}`}
                  className="min-h-[5rem] text-xs leading-relaxed"
                  placeholder="e.g. Tenant obtained a lower quote from their own cleaner and accepts $420 instead."
                  value={tenantNotice}
                  disabled={busy || rc.tenantQuoteResponse === 'accepted'}
                  onChange={(e) => setTenantNotice(e.target.value)}
                />
              </div>
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
                  onClick={() => void recordTenantOwnPrice()}
                >
                  Record tenant own price
                </Button>
              </div>
            ) : null}
          </section>

          <EndLeasingReportComparisonPanel caseData={caseData} mode="inspector-readonly" />
        </>
      ) : null}
    </div>
  );
}
