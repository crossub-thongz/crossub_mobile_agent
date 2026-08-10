'use client';

import { useState } from 'react';

import { RentReviewLeaseAgreementContractPanel } from '@/components/rent-review/rent-review-lease-agreement-contract-panel';
import { RentReviewEndLeasingPanel } from '@/components/rent-review/rent-review-end-leasing-panel';
import { RentReviewSignedLeaseAgreementCard } from '@/components/rent-review/rent-review-signed-lease-agreement-card';
import { RentReviewTenantAcceptanceSummary } from '@/components/rent-review/rent-review-tenant-acceptance-summary';
import {
  buildTenantAcceptanceSummary,
  isPreferredRenewalFixed,
  isTenantAccepted,
  isTenantDeclined,
} from '@/lib/rent-review/tenant-decision-display';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
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
  const [busy, setBusy] = useState(false);
  const accepted = isTenantAccepted(detail);
  const declined = isTenantDeclined(detail);
  const acceptance = buildTenantAcceptanceSummary(detail);
  const fixedRenewal = isPreferredRenewalFixed(detail);
  const awaiting = !accepted && !declined;

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
            Awaiting tenant accept or decline via the tenant portal.
          </p>
        ) : null}
      </section>

      {accepted && fixedRenewal && !readOnly ? (
        <RentReviewLeaseAgreementContractPanel detail={detail} onUpdated={onUpdated} />
      ) : null}

      {accepted && fixedRenewal ? <RentReviewSignedLeaseAgreementCard detail={detail} /> : null}

      {declined && !readOnly ? (
        <RentReviewEndLeasingPanel
          detail={detail}
          busy={busy}
          showMoveOutSummary={false}
          onBusyChange={setBusy}
        />
      ) : null}

      {accepted && detail.workflowState === 'completed' ? (
        <p className="text-muted-foreground text-center text-xs">
          Rent review completed after the tenant signed the lease extension agreement.
        </p>
      ) : accepted && fixedRenewal && !readOnly ? (
        <p className="text-muted-foreground text-center text-xs">
          Complete the lease extension agreement above and send it to the tenant for signature.
        </p>
      ) : null}
    </div>
  );
}
