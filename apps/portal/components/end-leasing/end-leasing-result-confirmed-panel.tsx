'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { communicationsThread } from '@/constants/routes';
import { EndLeasingReportComparisonPanel } from '@/components/end-leasing/end-leasing-report-comparison-panel';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { terminationApi } from '@/lib/termination-case-api';
import { formatDateTime } from '@/lib/utils';
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
  const rc = caseData.reportComparison;
  const agentQuoteEmail = rc.agentRepairQuoteEmail ?? rc.landlordRepairQuoteEmail;
  const agentConfirmed = Boolean(rc.agentQuoteConfirmed);

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

          <EndLeasingReportComparisonPanel caseData={caseData} mode="tenant-response" />
        </>
      ) : null}
    </div>
  );
}
