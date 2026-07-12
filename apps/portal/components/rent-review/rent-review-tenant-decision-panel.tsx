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
import {
  buildLeaseAgreementProgress,
  buildTenantAcceptanceSummary,
  hasTenantCounterHistory,
  isPreferredRenewalFixed,
  isTenantAccepted,
  isTenantDeclined,
  tenantCounterAuditEntries,
} from '@/lib/rent-review/tenant-decision-display';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { createAgentTerminationCase } from '@/lib/crossub-api/agent-workflow-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

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
  const accepted = isTenantAccepted(detail);
  const declined = isTenantDeclined(detail);
  const acceptance = buildTenantAcceptanceSummary(detail);
  const leaseAgreement = buildLeaseAgreementProgress(detail);
  const counterHistory = tenantCounterAuditEntries(detail);
  const pendingCounter =
    detail.tenantCounterWeekly != null &&
    detail.workflowState === 'agent_review' &&
    !accepted &&
    !declined;

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
          Tenant feedback: accept, counter-offer, or decline. Rent increase start date and new lease
          dates are separate — the increase applies from the statutory date; a fixed-term renewal has
          its own start and end.
        </p>

        {accepted && acceptance ? (
          <div className="space-y-3">
            <p className="text-primary text-xs font-semibold uppercase">Tenant accepted</p>
            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">New rent price</dt>
                <dd className="text-primary font-medium tabular-nums">
                  {formatCurrency(acceptance.newRentWeekly)}/wk
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rent increase start date</dt>
                <dd className="font-medium">
                  {acceptance.rentIncreaseStartDate
                    ? formatDate(acceptance.rentIncreaseStartDate)
                    : 'TBC'}
                </dd>
              </div>
              {isPreferredRenewalFixed(detail) ? (
                <>
                  <div>
                    <dt className="text-muted-foreground">Lease term</dt>
                    <dd className="font-medium">
                      {acceptance.leaseTermWeeks != null
                        ? `${acceptance.leaseTermWeeks} weeks`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">New lease start</dt>
                    <dd className="font-medium">
                      {acceptance.newLeaseStart ? formatDate(acceptance.newLeaseStart) : '—'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">New lease end</dt>
                    <dd className="font-medium">
                      {acceptance.newLeaseEnd ? formatDate(acceptance.newLeaseEnd) : '—'}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Renewal type</dt>
                  <dd className="font-medium">Periodic — no new fixed lease dates</dd>
                </div>
              )}
            </dl>
            {acceptance.rentIncreaseStartDate &&
            acceptance.newLeaseStart &&
            acceptance.rentIncreaseStartDate !== acceptance.newLeaseStart ? (
              <p className="text-muted-foreground rounded-lg border bg-muted/20 p-2 text-[11px] leading-relaxed">
                Note: rent increase starts on{' '}
                <span className="font-medium">{formatDate(acceptance.rentIncreaseStartDate)}</span>,
                which is separate from the new lease period (
                {acceptance.newLeaseStart ? formatDate(acceptance.newLeaseStart) : '—'} –{' '}
                {acceptance.newLeaseEnd ? formatDate(acceptance.newLeaseEnd) : '—'}).
              </p>
            ) : null}
          </div>
        ) : declined ? (
          <div className="space-y-3 text-xs">
            <p className="font-medium text-rose-600">Tenant declined the increase</p>
            {detail.tenantMoveOutDate ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                  Move-out date
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatDate(detail.tenantMoveOutDate)}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Move-out date not recorded yet.</p>
            )}
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
        ) : pendingCounter || hasTenantCounterHistory(detail) ? (
          <div className="space-y-3 text-xs">
            <p className="font-medium text-amber-700 dark:text-amber-400">Counter-offer path</p>
            {detail.tenantCounterWeekly != null ? (
              <p>
                Tenant counter:{' '}
                <span className="font-semibold tabular-nums">
                  {formatCurrency(detail.tenantCounterWeekly)}/wk
                </span>
              </p>
            ) : null}
            {detail.rentNegotiable === false ? (
              <p className="text-muted-foreground rounded-lg border bg-muted/20 p-2">
                Marked non-negotiable — return to Agent Decision to re-propose at the confirmed
                rent. The tenant can then accept or decline only.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Return to Agent Decision to accept the counter, submit a revised counter-offer, or
                mark non-negotiable.
              </p>
            )}
            {counterHistory.length > 0 ? (
              <ul className="space-y-1 border-t pt-2">
                {counterHistory.map((e) => (
                  <li key={e.id}>
                    <span className="text-muted-foreground">{formatDateTime(e.at)} · </span>
                    <span className="font-medium">{e.message}</span>
                    {e.detail ? (
                      <span className="text-muted-foreground"> · {e.detail}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : showRecordResponse ? (
          <p className="text-muted-foreground text-xs">
            Notice sent — record the tenant&apos;s accept, counter, or decline when they reply offline.
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">Awaiting tenant response to the notice.</p>
        )}
      </section>

      {accepted && leaseAgreement.length > 0 ? (
        <section className="rounded-xl border bg-muted/20 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide">Lease agreement audit</p>
          <ol className="space-y-2">
            {leaseAgreement.map((step) => (
              <li key={step.id} className="flex items-start gap-2 text-xs">
                <span
                  className={
                    step.done
                      ? 'bg-primary/15 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold'
                      : 'bg-muted text-muted-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]'
                  }
                >
                  {step.done ? '✓' : '·'}
                </span>
                <div>
                  <p className={step.done ? 'font-medium' : 'text-muted-foreground'}>{step.label}</p>
                  {step.at ? (
                    <p className="text-muted-foreground text-[10px]">{formatDateTime(step.at)}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {showRecordResponse ? (
        <RentReviewTenantResponseOnBehalfPanel detail={detail} onUpdated={onUpdated} />
      ) : null}

      {detail.workflowState === 'tenant_accepted' ? (
        <Button
          className="w-full"
          disabled={busy || !detail.propertyId}
          onClick={() => {
            if (!detail.propertyId) {
              toast.error('No property linked to this rent review');
              return;
            }
            void run(
              () => rentReviewApi.submitAccounting(detail.id, detail.propertyId!),
              'Submitted to accounting for rent sync',
            );
          }}
        >
          Submit to accounting
        </Button>
      ) : detail.workflowState === 'accounting' ? (
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
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide">Activity</p>
          <ul className="space-y-1 text-xs">
            {auditEntries.map((e) => (
              <li key={e.id}>
                <span className="text-muted-foreground">{formatDateTime(e.at)} · </span>
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
