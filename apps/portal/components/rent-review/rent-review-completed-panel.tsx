'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { RentReviewEndLeasingPanel } from '@/components/rent-review/rent-review-end-leasing-panel';
import { RentReviewFullAuditLog } from '@/components/rent-review/rent-review-full-audit-log';
import { RentReviewLeaseAgreementAudit } from '@/components/rent-review/rent-review-lease-agreement-audit';
import { RentReviewTenantAcceptanceSummary } from '@/components/rent-review/rent-review-tenant-acceptance-summary';
import { Button } from '@/components/ui/button';
import {
  isRentReviewWorkflowClosed,
  type RentReviewAgentStep,
} from '@/lib/rent-review/agent-workflow-model';
import {
  buildLeaseAgreementProgress,
  buildTenantAcceptanceSummary,
  isPreferredRenewalFixed,
  isTenantAccepted,
  isTenantDeclined,
  isTenantVacatePathComplete,
} from '@/lib/rent-review/tenant-decision-display';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency, formatDate } from '@/lib/utils';

export function RentReviewCompletedPanel({
  detail,
  onUpdated,
  onNavigateToStep,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
  onNavigateToStep?: (step: RentReviewAgentStep) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);

  const weekly = detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent;
  const acceptance = buildTenantAcceptanceSummary(detail);
  const leaseAgreement = buildLeaseAgreementProgress(detail);
  const vacateComplete = isTenantVacatePathComplete(detail);
  const declined = isTenantDeclined(detail);
  const workflowClosed = isRentReviewWorkflowClosed(detail);

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
      {workflowClosed ? (
        <p className="text-muted-foreground rounded-lg border bg-muted/20 px-3 py-2 text-xs">
          Use the step rail above to review each stage. The full audit log below links back to the
          step where each event was recorded.
        </p>
      ) : null}

      <section className="rounded-xl border bg-primary/5 p-4">
        <p className="mb-2 text-sm font-semibold">Completed</p>
        {vacateComplete || declined ? (
          <div className="space-y-3 text-xs">
            <p className="font-medium text-rose-600">Tenant declined the increase</p>
            <p className="text-muted-foreground">
              Vacate path recorded — no accounting sync required.
            </p>
            {detail.tenantMoveOutDate ? (
              <dl className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Move-out date</dt>
                  <dd className="font-medium tabular-nums">
                    {formatDate(detail.tenantMoveOutDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Closed</dt>
                  <dd className="font-medium">
                    {detail.completedDate ? formatDate(detail.completedDate) : '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <dl className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Closed</dt>
                  <dd className="font-medium">
                    {detail.completedDate ? formatDate(detail.completedDate) : '—'}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        ) : isTenantAccepted(detail) && acceptance ? (
          <RentReviewTenantAcceptanceSummary summary={acceptance} showSchedulingNote={false} />
        ) : (
          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Final rent</dt>
              <dd className="text-primary font-medium tabular-nums">{formatCurrency(weekly)}/wk</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rent increase from</dt>
              <dd className="font-medium">{detail.effectiveDate ? formatDate(detail.effectiveDate) : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-medium">
                {detail.completedDate ? formatDate(detail.completedDate) : 'In progress'}
              </dd>
            </div>
          </dl>
        )}
        {isTenantAccepted(detail) && acceptance ? (
          <dl className="mt-3 grid gap-3 border-t pt-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-medium">
                {detail.completedDate ? formatDate(detail.completedDate) : 'In progress'}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      {declined ? (
        <RentReviewEndLeasingPanel detail={detail} busy={busy} onBusyChange={setBusy} />
      ) : null}

      {isTenantAccepted(detail) && isPreferredRenewalFixed(detail) ? (
        <RentReviewLeaseAgreementAudit steps={leaseAgreement} />
      ) : null}

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

      <RentReviewFullAuditLog detail={detail} onNavigateToStep={onNavigateToStep} />
    </div>
  );
}
