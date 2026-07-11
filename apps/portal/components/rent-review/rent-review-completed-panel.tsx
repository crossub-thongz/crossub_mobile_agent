'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { RentReviewEmailLog } from '@/components/rent-review/rent-review-email-log';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
  buildCompletionEmail,
} from '@/lib/rent-review/agent-workflow-model';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency, formatDate } from '@/lib/utils';

export function RentReviewCompletedPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);

  const completionEmail = buildCompletionEmail(detail);
  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.COMPLETED);
  const weekly = detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent;

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

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-primary/5 p-4">
        <p className="mb-2 text-sm font-semibold">Completed</p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Final rent</dt>
            <dd className="text-primary font-medium tabular-nums">{formatCurrency(weekly)}/wk</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Effective from</dt>
            <dd className="font-medium">{detail.effectiveDate ? formatDate(detail.effectiveDate) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Completed</dt>
            <dd className="font-medium">
              {detail.completedDate ? formatDate(detail.completedDate) : 'In progress'}
            </dd>
          </div>
        </dl>
      </section>

      {completionEmail ? (
        <RentReviewEmailLog title="Confirmation email to tenant" emails={[completionEmail]} />
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-3 text-xs">
          Confirmation email will be sent when accounting completes the rent sync.
        </p>
      )}

      {detail.workflowState === 'accounting' ? (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() =>
            void run(() => rentReviewApi.complete(detail.id), 'Rent review completed & system synced')
          }
        >
          Complete rent review & sync system
        </Button>
      ) : null}

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
