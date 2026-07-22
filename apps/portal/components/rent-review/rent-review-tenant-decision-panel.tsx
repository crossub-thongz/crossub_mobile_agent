'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { RentReviewEndLeasingPanel } from '@/components/rent-review/rent-review-end-leasing-panel';
import { RentReviewLeaseAgreementAudit } from '@/components/rent-review/rent-review-lease-agreement-audit';
import { RentReviewTenantAcceptanceSummary } from '@/components/rent-review/rent-review-tenant-acceptance-summary';
import {
  buildLeaseAgreementProgress,
  buildTenantAcceptanceSummary,
  isPreferredRenewalFixed,
  isTenantAccepted,
  isTenantDeclined,
  leaseAgreementAuditState,
} from '@/lib/rent-review/tenant-decision-display';
import { rentReviewApi } from '@/lib/rent-review-api';
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
  const [busy, setBusy] = useState(false);
  const [viewingAgreement, setViewingAgreement] = useState(false);
  const accepted = isTenantAccepted(detail);
  const declined = isTenantDeclined(detail);
  const acceptance = buildTenantAcceptanceSummary(detail);
  const leaseAgreement = buildLeaseAgreementProgress(detail);
  const leaseAudit = leaseAgreementAuditState(detail);
  const fixedRenewal = isPreferredRenewalFixed(detail);
  const awaiting = !accepted && !declined;

  const viewResidentialTenancyAgreement = async () => {
    setViewingAgreement(true);
    try {
      const blob = await rentReviewApi.downloadLeaseExtensionAgreement(detail.id, {
        draft: !accepted,
        weekly: detail.proposedWeeklyRent ?? undefined,
        propertyId: detail.propertyId,
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setViewingAgreement(false);
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
            Awaiting tenant accept or decline via the tenant portal.
          </p>
        ) : null}
      </section>

      {fixedRenewal ? (
        <section className="rounded-xl border bg-card p-4">
          <dl className="text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Lease extension agreement</dt>
              <dd className="mt-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-xs"
                  disabled={viewingAgreement}
                  onClick={() => void viewResidentialTenancyAgreement()}
                >
                  <FileDown className="size-3.5" />
                  {viewingAgreement ? 'Opening…' : accepted ? 'View agreement' : 'Preview agreement'}
                </Button>
              </dd>
            </div>
          </dl>
        </section>
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
        <RentReviewLeaseAgreementAudit
          steps={leaseAgreement}
          onViewAgreement={() => void viewResidentialTenancyAgreement()}
          viewingAgreement={viewingAgreement}
          viewLabel={leaseAudit.signedDone ? 'View signed agreement' : 'Preview agreement'}
        />
      ) : null}

      {accepted && detail.workflowState === 'completed' ? (
        <p className="text-muted-foreground text-center text-xs">
          Rent review completed and system synced automatically after tenant acceptance.
        </p>
      ) : null}
    </div>
  );
}
