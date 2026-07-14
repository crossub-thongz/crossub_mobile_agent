'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { RentReviewEndLeasingPanel } from '@/components/rent-review/rent-review-end-leasing-panel';
import { RentReviewLeaseAgreementAudit } from '@/components/rent-review/rent-review-lease-agreement-audit';
import { RentReviewTenantAcceptanceSummary } from '@/components/rent-review/rent-review-tenant-acceptance-summary';
import { RentReviewTenantResponseOnBehalfPanel } from '@/components/rent-review/rent-review-tenant-response-on-behalf-panel';
import { canRecordTenantResponseOnBehalf } from '@/lib/rent-review/agent-workflow-model';
import {
  buildLeaseAgreementProgress,
  buildTenantAcceptanceSummary,
  isPreferredRenewalFixed,
  isTenantAccepted,
  isTenantDeclined,
  leaseAgreementAuditState,
} from '@/lib/rent-review/tenant-decision-display';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatDate } from '@/lib/utils';

export function RentReviewTenantDecisionPanel({
  detail,
  onUpdated,
  readOnly,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
  readOnly?: boolean;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);

  const showRecordResponse = canRecordTenantResponseOnBehalf(detail);
  const accepted = isTenantAccepted(detail);
  const declined = isTenantDeclined(detail);
  const acceptance = buildTenantAcceptanceSummary(detail);
  const leaseAgreement = buildLeaseAgreementProgress(detail);
  const leaseAudit = leaseAgreementAuditState(detail);
  const fixedRenewal = isPreferredRenewalFixed(detail);
  const awaiting = !accepted && !declined;

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
        <p className="mb-4 text-sm font-semibold">Tenant decision</p>

        {accepted && acceptance ? (
          <div className="space-y-3">
            <p className="text-primary text-xs font-semibold uppercase">Tenant accepted</p>
            <RentReviewTenantAcceptanceSummary summary={acceptance} />
          </div>
        ) : null}

        {declined ? (
          <div className={accepted ? 'mt-6 space-y-3 border-t pt-4' : 'space-y-3'}>
            <p className="text-xs font-semibold uppercase text-rose-600 dark:text-rose-400">
              Tenant declined
            </p>
            <dl className="text-sm">
              <dt className="text-muted-foreground text-xs">Move out date</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {detail.tenantMoveOutDate ? formatDate(detail.tenantMoveOutDate) : '—'}
              </dd>
            </dl>
          </div>
        ) : null}

        {awaiting ? (
          <p className="text-muted-foreground text-xs">
            {showRecordResponse
              ? 'Awaiting tenant accept or decline. Record their response below, or use Negotiation if they counter-offer.'
              : 'Awaiting tenant accept or decline after the formal notice.'}
          </p>
        ) : null}
      </section>

      {showRecordResponse && !readOnly ? (
        <RentReviewTenantResponseOnBehalfPanel detail={detail} onUpdated={onUpdated} readOnly={readOnly} />
      ) : null}

      {declined && !readOnly ? (
        <RentReviewEndLeasingPanel
          detail={detail}
          busy={busy}
          showMoveOutSummary={false}
          onBusyChange={setBusy}
        />
      ) : null}

      {accepted && fixedRenewal ? (
        <RentReviewLeaseAgreementAudit steps={leaseAgreement} />
      ) : null}

      {accepted && detail.workflowState === 'tenant_accepted' && !readOnly ? (
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
            disabled={busy || !detail.propertyId || (fixedRenewal && !leaseAudit.signedDone)}
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
      ) : detail.workflowState === 'accounting' && !readOnly ? (
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
    </div>
  );
}
