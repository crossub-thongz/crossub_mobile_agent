'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { RentReviewEndLeasingPanel } from '@/components/rent-review/rent-review-end-leasing-panel';
import { RentReviewSignedLeaseAgreementCard } from '@/components/rent-review/rent-review-signed-lease-agreement-card';
import { RentReviewTenantAcceptanceSummary } from '@/components/rent-review/rent-review-tenant-acceptance-summary';
import {
  buildTenantAcceptanceSummary,
  isPreferredRenewalFixed,
  isTenantAccepted,
  isTenantDeclined,
} from '@/lib/rent-review/tenant-decision-display';
import { loadRentReviewLeaseAgreementPdf } from '@/lib/rent-review/rent-review-lease-agreement-pdf';
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
  const fixedRenewal = isPreferredRenewalFixed(detail);
  const awaiting = !accepted && !declined;

  const previewPresignedAgreement = async () => {
    setViewingAgreement(true);
    try {
      const { blob, filename } = await loadRentReviewLeaseAgreementPdf(detail.id, {
        draft: true,
        weekly: detail.proposedWeeklyRent ?? undefined,
        propertyId: detail.propertyId,
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      void filename;
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

      {awaiting && fixedRenewal ? (
        <section className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Lease extension agreement</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Preview the agreement prepared for the tenant — landlord and managing agent signatures
            are already applied.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8 gap-1.5 px-2.5 text-xs"
            disabled={viewingAgreement}
            onClick={() => void previewPresignedAgreement()}
          >
            <FileDown className="size-3.5" />
            {viewingAgreement ? 'Opening…' : 'Preview agreement'}
          </Button>
        </section>
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
          Rent review completed and system synced automatically after tenant acceptance.
        </p>
      ) : null}
    </div>
  );
}
