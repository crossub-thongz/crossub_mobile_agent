'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { RentReviewCompletedCaseSummary } from '@/components/rent-review/rent-review-completed-case-summary';
import { RentReviewEndLeasingPanel } from '@/components/rent-review/rent-review-end-leasing-panel';
import { RentReviewFullAuditLog } from '@/components/rent-review/rent-review-full-audit-log';
import { RentReviewLeaseAgreementAudit } from '@/components/rent-review/rent-review-lease-agreement-audit';
import { Button } from '@/components/ui/button';
import {
  isRentReviewWorkflowClosed,
  type RentReviewAgentStep,
} from '@/lib/rent-review/agent-workflow-model';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import {
  formatLeaseExtensionAgreementStatus,
  isPreferredRenewalFixed,
  isTenantAccepted,
  isTenantDeclined,
  isTenantVacatePathComplete,
  leaseAgreementAuditState,
} from '@/lib/rent-review/tenant-decision-display';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatDate } from '@/lib/utils';

export function RentReviewCompletedPanel({
  detail,
  onUpdated,
  onNavigateToStep,
  readOnly = false,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
  onNavigateToStep?: (step: RentReviewAgentStep) => void;
  readOnly?: boolean;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);

  const accepted = isTenantAccepted(detail);
  const declined = isTenantDeclined(detail);
  const vacateComplete = isTenantVacatePathComplete(detail);
  const fixedRenewal = isPreferredRenewalFixed(detail);
  const leaseAudit = leaseAgreementAuditState(detail);
  const workflowClosed = isRentReviewWorkflowClosed(detail);
  const leaseExtensionStatus = formatLeaseExtensionAgreementStatus(leaseAudit);

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

  const viewResidentialTenancyAgreement = async () => {
    setBusy(true);
    try {
      const blob = await rentReviewApi.downloadLeaseExtensionAgreement(detail.id, {
        propertyId: detail.propertyId,
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <RentReviewCompletedCaseSummary detail={detail} />

      <section className="rounded-xl border bg-card p-4">
        <p className="mb-4 text-sm font-semibold">Completed</p>

        {accepted && fixedRenewal ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Situation 1 — tenant accepted
            </p>
            <dl className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Lease extension agreement</dt>
                  <dd className="mt-0.5 font-medium">{leaseExtensionStatus}</dd>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => void viewResidentialTenancyAgreement()}
                >
                  <FileDown className="size-3.5" />
                  {leaseAudit.signedDone ? 'View signed agreement' : 'Preview agreement'}
                </Button>
              </div>
            </dl>
            <RentReviewLeaseAgreementAudit
              steps={leaseAudit.steps}
              onViewAgreement={() => void viewResidentialTenancyAgreement()}
              viewingAgreement={busy}
              viewLabel={leaseAudit.signedDone ? 'View signed agreement' : 'Preview agreement'}
            />
          </div>
        ) : accepted ? (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Situation 1 — tenant accepted
            </p>
            <p className="font-medium">Periodic renewal — no residential tenancy agreement required.</p>
            <p className="text-muted-foreground text-xs">
              {workflowClosed
                ? 'Rent review closed and system sync completed.'
                : 'Complete accounting sync to close this case.'}
            </p>
          </div>
        ) : null}

        {declined || vacateComplete ? (
          <div className={accepted ? 'mt-6 space-y-3 border-t pt-4' : 'space-y-3'}>
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Situation 2 — tenant declined
            </p>
            <div className="rounded-lg border border-dashed bg-muted/20 p-4">
              <p className="text-sm font-semibold">End leasing</p>
              {detail.tenantMoveOutDate ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  Move-out {formatDate(detail.tenantMoveOutDate)}
                  {detail.completedDate ? ` · closed ${formatDate(detail.completedDate)}` : ''}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1 text-xs">
                  Start the end-leasing workflow to manage vacate and bond release.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {!accepted && !declined ? (
          <p className="text-muted-foreground text-xs">
            This case is not closed yet — finish Tenant decision and accounting sync first.
          </p>
        ) : null}
      </section>

      {declined && !readOnly ? (
        <RentReviewEndLeasingPanel
          detail={detail}
          busy={busy}
          showMoveOutSummary={false}
          onBusyChange={setBusy}
        />
      ) : null}

      {detail.workflowState === 'accounting' && !readOnly ? (
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

      <RentReviewFullAuditLog
        detail={detail}
        defaultExpanded={false}
        onNavigateToStep={onNavigateToStep}
      />
    </div>
  );
}
