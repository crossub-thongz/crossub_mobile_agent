'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { JobCaseSentEmailPreviewCard } from '@/components/agent/job-case-email-log';
import { Button } from '@/components/ui/button';
import { EndLeasingReportComparisonPanel } from '@/components/end-leasing/end-leasing-report-comparison-panel';
import { endLeasingStoredEmailToRecord } from '@/lib/end-leasing/agent-workflow-model';
import type { EndLeasingOverviewEmail, TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { terminationApi } from '@/lib/termination-case-api';
import { formatDateTime } from '@/lib/utils';
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

  const rc = caseData.reportComparison;
  const agentQuoteEmail = rc.agentRepairQuoteEmail ?? rc.landlordRepairQuoteEmail;
  const agentQuoteRecordId = rc.agentRepairQuoteEmail
    ? `${caseData.id}-agent-repair-quote`
    : `${caseData.id}-landlord-repair-quote`;
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
          Review landlord and tenant quote totals, then confirm before the tenant responds in the
          tenant app.
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
        <EndLeasingReportComparisonPanel caseData={caseData} mode="inspector-readonly" />
      ) : null}
    </div>
  );
}
