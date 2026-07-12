'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { RentReviewTenantResponseOnBehalfPanel } from '@/components/rent-review/rent-review-tenant-response-on-behalf-panel';
import { ROUTES } from '@/constants/routes';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
  canRecordTenantResponseOnBehalf,
} from '@/lib/rent-review/agent-workflow-model';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { createAgentTerminationCase } from '@/lib/crossub-api/agent-workflow-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency } from '@/lib/utils';

export function RentReviewTenantDecisionPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState(detail.tenantMoveOutDate ?? '');

  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.TENANT_DECISION);
  const showRecordResponse = canRecordTenantResponseOnBehalf(detail);

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

  const startEndLeasing = async () => {
    if (!detail.propertyId) {
      toast.error('No property linked to this rent review');
      return;
    }
    setBusy(true);
    try {
      const result = await createAgentTerminationCase(detail.propertyId, {
        terminationType: 'tenant_initiated',
        terminationReason: 'Tenant rejected rent increase — vacating',
        expectedVacateDate: moveOutDate || detail.tenantMoveOutDate || undefined,
      });
      toast.success('End leasing case created');
      window.location.href = `${ROUTES.PROPERTIES}/${detail.propertyId}?tab=leasing&case=${result.id}`;
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Tenant decision</p>
        <p className="text-muted-foreground mb-3 text-xs">
          Tenant accepts → rent and effective date update automatically. Rejects → move out (End
          Leasing) or counter-offer (returns to Agent Confirmed).
        </p>
        {detail.workflowState === 'tenant_accepted' || detail.workflowState === 'accounting' ? (
          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Agreed rent</dt>
              <dd className="text-primary font-medium tabular-nums">
                {formatCurrency(detail.proposedWeeklyRent ?? detail.currentWeeklyRent)}/wk
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Effective from</dt>
              <dd className="font-medium">{detail.effectiveDate ?? 'TBC'}</dd>
            </div>
          </dl>
        ) : detail.workflowState === 'tenant_rejected' ? (
          <div className="space-y-2 text-xs">
            <p className="font-medium text-rose-600">Tenant rejected the increase</p>
            {detail.tenantMoveOutDate ? (
              <p className="text-muted-foreground">Move-out date: {detail.tenantMoveOutDate}</p>
            ) : null}
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={busy}
              onClick={() => void startEndLeasing()}
            >
              <ExternalLink className="size-4" />
              Start End Leasing
            </Button>
          </div>
        ) : showRecordResponse ? (
          <p className="text-muted-foreground text-xs">
            Notice sent — record the tenant&apos;s response below when they reply by phone, email, or
            in person.
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">Awaiting tenant response to the notice.</p>
        )}
      </section>

      {showRecordResponse ? (
        <RentReviewTenantResponseOnBehalfPanel detail={detail} onUpdated={onUpdated} />
      ) : null}

      {detail.workflowState === 'tenant_accepted' ? (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() =>
            void run(
              () => rentReviewApi.submitAccounting(detail.id),
              'Submitted to accounting for rent sync',
            )
          }
        >
          Submit to accounting
        </Button>
      ) : detail.workflowState === 'accounting' ? (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() =>
            void run(
              () => rentReviewApi.complete(detail.id),
              'Rent review completed & system synced',
            )
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
