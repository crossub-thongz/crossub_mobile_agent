'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
} from '@/lib/rent-review/agent-workflow-model';
import {
  buildTenantAcceptanceSummary,
  isPreferredRenewalFixed,
  isTenantAccepted,
  isTenantDeclined,
} from '@/lib/rent-review/tenant-decision-display';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export function RentReviewCompletedPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);

  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.COMPLETED);
  const weekly = detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent;
  const acceptance = buildTenantAcceptanceSummary(detail);

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
            <dt className="text-muted-foreground">Rent increase from</dt>
            <dd className="font-medium">{detail.effectiveDate ? formatDate(detail.effectiveDate) : '—'}</dd>
          </div>
          {isTenantAccepted(detail) && acceptance && isPreferredRenewalFixed(detail) ? (
            <>
              <div>
                <dt className="text-muted-foreground">New lease period</dt>
                <dd className="font-medium">
                  {acceptance.newLeaseStart && acceptance.newLeaseEnd
                    ? `${formatDate(acceptance.newLeaseStart)} – ${formatDate(acceptance.newLeaseEnd)}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lease term</dt>
                <dd className="font-medium">
                  {acceptance.leaseTermWeeks != null ? `${acceptance.leaseTermWeeks} weeks` : '—'}
                </dd>
              </div>
            </>
          ) : null}
          {isTenantDeclined(detail) && detail.tenantMoveOutDate ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Tenant move-out</dt>
              <dd className="font-medium">{formatDate(detail.tenantMoveOutDate)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Completed</dt>
            <dd className="font-medium">
              {detail.completedDate ? formatDate(detail.completedDate) : 'In progress'}
            </dd>
          </div>
        </dl>
      </section>

      {detail.workflowState === 'accounting' ? (
        <Button
          className="w-full"
          disabled={busy || !detail.propertyId}
          onClick={() => {
            if (!detail.propertyId) {
              toast.error('No property linked to this rent review');
              return;
            }
            void run(
              () => rentReviewApi.complete(detail.id, detail.propertyId!),
              'Rent review completed & system synced',
            );
          }}
        >
          Complete rent review & sync system
        </Button>
      ) : null}

      {auditEntries.length > 0 ? (
        <section className="rounded-xl border bg-muted/20 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Full workflow audit ({auditEntries.length} events)
          </p>
          <ul className="space-y-2 text-xs">
            {auditEntries.map((e) => (
              <li key={e.id} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground tabular-nums">{formatDateTime(e.at)}</span>
                  <span className="text-muted-foreground capitalize">· {e.actor}</span>
                </div>
                <p className="mt-0.5 font-medium">{e.message}</p>
                {e.detail ? <p className="text-muted-foreground mt-0.5">{e.detail}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
