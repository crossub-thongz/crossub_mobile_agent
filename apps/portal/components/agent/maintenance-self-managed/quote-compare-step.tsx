'use client';

import { useState } from 'react';

import { StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAINTENANCE_QUOTE_STATUS,
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  approveMaintenanceQuotation,
  declineMaintenanceQuotation,
  fetchAgentMaintenanceDetail,
  type AgentMaintenanceDetail,
} from '@/lib/crossub-api/maintenance-client';
import { quoteDecisionCopiesOwner } from '@/lib/maintenance/self-managed-steps';
import { formatCurrency } from '@/lib/utils';

/**
 * The submitted quotes side by side, lowest flagged, with approve and decline. Decisions go
 * through the agent quote routes, which copy the owner above the repair limit.
 */
export function QuoteCompareStep({
  detail,
  busy,
  run,
}: {
  detail: AgentMaintenanceDetail;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const submitted = detail.quotes.filter((q) => q.status === MAINTENANCE_QUOTE_STATUS.SUBMITTED);
  if (submitted.length === 0) return null;

  // The quote routes return the card, not the detail, so the detail is re-read after.
  const thenDetail = (action: () => Promise<unknown>) => async () => {
    await action();
    return fetchAgentMaintenanceDetail(detail.id);
  };

  const decline = async (quotationId: string) => {
    const ok = await run(
      thenDetail(() => declineMaintenanceQuotation(detail.id, quotationId, reason.trim())),
      COPY.quoteDeclined,
    );
    if (ok) {
      setDeclining(null);
      setReason('');
    }
  };

  return (
    <StepCard title={COPY.compareTitle} hint={COPY.compareHint}>
      <ul className="divide-border/60 divide-y">
        {submitted.map((q) => (
          <li key={q.id} className="space-y-1.5 py-2 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium">
                {q.contractorName ?? COPY.tradie}
              </p>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {q.total === null ? COPY.noQuoteTotal : formatCurrency(q.total)}
              </p>
            </div>
            {q.scope ? <p className="text-muted-foreground line-clamp-2 text-xs">{q.scope}</p> : null}
            <div className="flex flex-wrap items-center gap-1.5">
              {q.isLowest ? (
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  {COPY.lowest}
                </span>
              ) : null}
              {quoteDecisionCopiesOwner(q.total, detail.spendThreshold) ? (
                <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[11px]">
                  {COPY.ownerCopied}
                </span>
              ) : null}
              <span className="flex-1" />
              <Button
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={busy}
                onClick={() =>
                  void run(
                    thenDetail(() => approveMaintenanceQuotation(detail.id, q.id)),
                    COPY.quoteApproved,
                  )
                }
              >
                {COPY.approve}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                disabled={busy}
                onClick={() => {
                  setDeclining(declining === q.id ? null : q.id);
                  setReason('');
                }}
              >
                {COPY.decline}
              </Button>
            </div>
            {declining === q.id ? (
              <div className="flex gap-2">
                <Input
                  aria-label={COPY.declineReason}
                  placeholder={COPY.declineReason}
                  value={reason}
                  disabled={busy}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={busy || !reason.trim()}
                  onClick={() => void decline(q.id)}
                >
                  {COPY.declineConfirm}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </StepCard>
  );
}
