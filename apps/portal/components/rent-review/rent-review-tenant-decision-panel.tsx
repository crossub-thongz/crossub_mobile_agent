'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { RentReviewActivityLog } from '@/components/rent-review/rent-review-activity-log';
import { RentReviewEndLeasingPanel } from '@/components/rent-review/rent-review-end-leasing-panel';
import { RentReviewLeaseAgreementAudit } from '@/components/rent-review/rent-review-lease-agreement-audit';
import { RentReviewTenantAcceptanceSummary } from '@/components/rent-review/rent-review-tenant-acceptance-summary';
import { RentReviewTenantResponseOnBehalfPanel } from '@/components/rent-review/rent-review-tenant-response-on-behalf-panel';
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
  leaseAgreementAuditState,
  tenantCounterAuditEntries,
} from '@/lib/rent-review/tenant-decision-display';
import {
  buildNegotiationComparison,
  formatNegotiationDelta,
  hasPendingTenantCounter,
} from '@/lib/rent-review/negotiation-display';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
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

  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.TENANT_DECISION);
  const showRecordResponse = canRecordTenantResponseOnBehalf(detail);
  const accepted = isTenantAccepted(detail);
  const declined = isTenantDeclined(detail);
  const acceptance = buildTenantAcceptanceSummary(detail);
  const leaseAgreement = buildLeaseAgreementProgress(detail);
  const leaseAudit = leaseAgreementAuditState(detail);
  const fixedRenewal = isPreferredRenewalFixed(detail);
  const counterHistory = tenantCounterAuditEntries(detail);
  const pendingCounter = hasPendingTenantCounter(detail) && !accepted && !declined;
  const negotiation = buildNegotiationComparison(detail);
  const counterDelta = formatNegotiationDelta(negotiation.deltaWeekly);

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
        <p className="mb-2 text-sm font-semibold">Tenant decision</p>
        <p className="text-muted-foreground mb-3 text-xs">
          Tenant feedback: accept, counter-offer, or decline. Rent increase start date and new lease
          dates are separate — the increase applies from the statutory date; a fixed-term renewal has
          its own start and end.
        </p>

        {accepted && acceptance ? (
          <div className="space-y-3">
            <p className="text-primary text-xs font-semibold uppercase">Tenant accepted</p>
            <RentReviewTenantAcceptanceSummary summary={acceptance} />
          </div>
        ) : declined ? (
          <div className="space-y-3 text-xs">
            <p className="font-medium text-rose-600">Tenant declined the increase</p>
            <RentReviewEndLeasingPanel detail={detail} busy={busy} onBusyChange={setBusy} />
          </div>
        ) : pendingCounter || hasTenantCounterHistory(detail) ? (
          <div className="space-y-3 text-xs">
            <p className="font-medium text-amber-700 dark:text-amber-400">Counter-offer path</p>
            {pendingCounter && negotiation.tenantCounterWeekly != null ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  Tenant counter submitted
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-amber-900 dark:text-amber-100">
                  {formatCurrency(negotiation.tenantCounterWeekly)}/wk
                </p>
                {negotiation.agentWeekly != null ? (
                  <p className="text-muted-foreground mt-1">
                    vs agent proposed {formatCurrency(negotiation.agentWeekly)}/wk
                    {counterDelta ? ` (${counterDelta})` : ''}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-2">
                  Sent back to agent for confirmation on the Agent decision step.
                </p>
              </div>
            ) : null}
            {detail.rentNegotiable === false ? (
              <p className="text-muted-foreground rounded-lg border bg-muted/20 p-2">
                Marked non-negotiable — re-send notice on Tenant notified. The tenant can then
                accept or decline only.
              </p>
            ) : pendingCounter ? (
              <p className="text-muted-foreground">
                On Agent decision: accept the counter, submit an agent counter-offer, or mark
                non-negotiable.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Negotiation in progress — check Agent decision and Tenant notified for the latest
                terms.
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

      {showRecordResponse ? (
        <RentReviewTenantResponseOnBehalfPanel detail={detail} onUpdated={onUpdated} />
      ) : null}

      {accepted && fixedRenewal ? (
        <RentReviewLeaseAgreementAudit steps={leaseAgreement} />
      ) : null}

      {accepted && detail.workflowState === 'tenant_accepted' ? (
        <div className="space-y-2">
          {fixedRenewal && leaseAudit.preparingDone && !leaseAudit.sentDone ? (
            <Button
              className="w-full"
              variant="outline"
              disabled={busy || !detail.propertyId}
              onClick={() => {
                if (!detail.propertyId) {
                  toast.error('No property linked to this rent review');
                  return;
                }
                void run(
                  () => rentReviewApi.sendLeaseAgreement(detail.id, detail.propertyId!),
                  'Lease agreement sent to tenant',
                );
              }}
            >
              Send lease agreement to tenant
            </Button>
          ) : null}
          {fixedRenewal && leaseAudit.sentDone && !leaseAudit.signedDone ? (
            <Button
              className="w-full"
              variant="outline"
              disabled={busy || !detail.propertyId}
              onClick={() => {
                if (!detail.propertyId) {
                  toast.error('No property linked to this rent review');
                  return;
                }
                void run(
                  () => rentReviewApi.recordLeaseAgreementSigned(detail.id, detail.propertyId!),
                  'Lease agreement marked signed',
                );
              }}
            >
              Record lease agreement signed
            </Button>
          ) : null}
          <Button
            className="w-full"
            disabled={
              busy ||
              !detail.propertyId ||
              (fixedRenewal && !leaseAudit.signedDone)
            }
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
          {fixedRenewal && !leaseAudit.signedDone ? (
            <p className="text-muted-foreground text-center text-[11px]">
              Complete the lease agreement flow (preparing → sent → signed) before accounting.
            </p>
          ) : null}
        </div>
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

      <RentReviewActivityLog entries={auditEntries} showTimestamp />
    </div>
  );
}
