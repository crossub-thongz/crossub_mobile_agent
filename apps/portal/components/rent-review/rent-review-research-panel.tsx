'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  RENT_RESEARCH_PLATFORMS,
  auditEntriesForStep,
  RENT_REVIEW_AGENT_STEP,
} from '@/lib/rent-review/agent-workflow-model';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency } from '@/lib/utils';

export function RentReviewResearchPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);

  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.RENT_RESEARCH);
  const suggested = detail.ai.suggestedWeekly;

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
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Rent research</p>
        <p className="text-muted-foreground mb-3 text-xs">
          Market research via {RENT_RESEARCH_PLATFORMS.join(', ')}. Results are emailed to the
          agent with current and recommended rent.
        </p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Current rent</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(detail.currentWeeklyRent)}/wk</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Recommended rent</dt>
            <dd className="text-primary font-medium tabular-nums">
              {suggested != null ? `${formatCurrency(suggested)}/wk` : 'Pending research'}
              {detail.ai.increasePercent != null ? ` (+${detail.ai.increasePercent}%)` : ''}
            </dd>
          </div>
        </dl>
        {detail.ai.rationale ? (
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{detail.ai.rationale}</p>
        ) : null}
      </section>

      {detail.workflowState === 'pending_confirmation' ? (
        <div className="space-y-2">
          <Button
            className="w-full gap-2"
            disabled={busy}
            onClick={() =>
              void run(
                () => rentReviewApi.confirm(detail.id, { type: 'rent_review' }),
                'Rent review confirmed — proceeding to agent review',
              )
            }
          >
            <RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />
            Confirm rent review & run market research
          </Button>
          <p className="text-muted-foreground text-[11px]">
            Confirms the review pathway and seeds the recommended rent from comparables.
          </p>
        </div>
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
