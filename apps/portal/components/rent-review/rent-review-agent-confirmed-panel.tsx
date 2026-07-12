'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
} from '@/lib/rent-review/agent-workflow-model';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency } from '@/lib/utils';

export function RentReviewAgentConfirmedPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [customWeekly, setCustomWeekly] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const hasCounter = detail.tenantCounterWeekly != null;

  useEffect(() => {
    const defaultWeekly = String(
      detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent,
    );
    setCustomWeekly(defaultWeekly);
    setEffectiveDate(detail.effectiveDate ?? '');
  }, [detail]);

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

  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">
          {hasCounter ? 'Tenant counter-offer' : 'Agent confirmation'}
        </p>
        <p className="text-muted-foreground mb-3 text-xs">
          {hasCounter
            ? 'Tenant provided a counter-offer. Accept it or revise the proposed rent and re-notify.'
            : 'Confirm or adjust the proposed rent and effective date before notifying the tenant.'}
        </p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Current rent</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(detail.currentWeeklyRent)}/wk</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">CROSSUB suggested</dt>
            <dd className="text-primary font-medium tabular-nums">
              {formatCurrency(detail.ai.suggestedWeekly ?? detail.currentWeeklyRent)}/wk
            </dd>
          </div>
          {hasCounter ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Tenant counter</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(detail.tenantCounterWeekly!)}/wk
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {detail.workflowState === 'agent_review' || detail.workflowState === 'negotiation' ? (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          {hasCounter ? (
            <>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => rentReviewApi.resolveNegotiation(detail.id, { action: 'accept_counter' }),
                    'Tenant counter accepted',
                  )
                }
              >
                Accept tenant counter {formatCurrency(detail.tenantCounterWeekly!)}/wk
              </Button>
              <div className="space-y-2">
                <Label htmlFor="revised-weekly">Revised proposed rent ($/week)</Label>
                <Input
                  id="revised-weekly"
                  type="number"
                  value={customWeekly}
                  onChange={(e) => setCustomWeekly(e.target.value)}
                />
                <Label htmlFor="revised-effective">Effective date</Label>
                <Input
                  id="revised-effective"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy || !customWeekly}
                  onClick={() =>
                    void run(
                      () =>
                        rentReviewApi.resolveNegotiation(detail.id, {
                          action: 'repropose',
                          resolvedWeekly: Number(customWeekly),
                          effectiveDate: effectiveDate || undefined,
                        }),
                      'Revised proposal recorded — send tenant notice when ready',
                    )
                  }
                >
                  Decline counter & set revised rent
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => rentReviewApi.approveAi(detail.id),
                    `Aligned with CROSSUB suggested ${formatCurrency(detail.ai.suggestedWeekly ?? detail.currentWeeklyRent)}/wk`,
                  )
                }
              >
                Agree with CROSSUB suggested{' '}
                {formatCurrency(detail.ai.suggestedWeekly ?? detail.currentWeeklyRent)}/wk
              </Button>
              <div className="space-y-2">
                <Label htmlFor="custom-weekly">Landlord / agent proposed rent ($/week)</Label>
                <Input
                  id="custom-weekly"
                  type="number"
                  value={customWeekly}
                  onChange={(e) => setCustomWeekly(e.target.value)}
                />
                <Label htmlFor="effective-date">Effective date</Label>
                <Input
                  id="effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy || !customWeekly || !effectiveDate}
                  onClick={() =>
                    void run(
                      () =>
                        rentReviewApi.setProposedRent(detail.id, {
                          weekly: Number(customWeekly),
                          effectiveDate,
                        }),
                      'Custom rent proposal saved',
                    )
                  }
                >
                  Confirm custom amount
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground rounded-xl border bg-muted/20 p-3 text-xs">
          Agent confirmed {formatCurrency(detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent)}/wk
          {detail.effectiveDate ? ` · effective ${detail.effectiveDate}` : ''}
        </p>
      )}

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
