'use client';

import { rentReviewLeaseTypeLabel } from '@/lib/rent-review/agent-workflow-model';
import { RentReviewSignedLeaseAgreementCard } from '@/components/rent-review/rent-review-signed-lease-agreement-card';
import { RentReviewTenantAcceptanceSummary } from '@/components/rent-review/rent-review-tenant-acceptance-summary';
import { formatRentReviewTermLabel } from '@/lib/rent-review-lease-helpers';
import {
  buildTenantAcceptanceSummary,
  isPreferredRenewalFixed,
  isTenantAccepted,
  isTenantDeclined,
} from '@/lib/rent-review/tenant-decision-display';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { formatCurrency, formatDate } from '@/lib/utils';

function formatLeaseEndShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function CompletedResearchSection({ detail }: { detail: RentReviewWorkflowDetail }) {
  const suggested = detail.ai.suggestedWeekly;

  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-sm font-semibold">Research results</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Current rent</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatCurrency(detail.currentWeeklyRent)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Lease type</dt>
            <dd className="mt-0.5 font-medium">{rentReviewLeaseTypeLabel(detail)}</dd>
          </div>
        </dl>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Lease end</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {formatLeaseEndShort(detail.leaseEndDate)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Recommended rent value</dt>
            <dd className="text-primary mt-0.5 font-semibold tabular-nums">
              {suggested != null ? formatCurrency(suggested) : '—'}
              {detail.ai.increasePercent != null ? (
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  (+{detail.ai.increasePercent}%)
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>
      {detail.ai.rationale ? (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{detail.ai.rationale}</p>
      ) : null}
    </section>
  );
}

function CompletedAgentDecisionSection({ detail }: { detail: RentReviewWorkflowDetail }) {
  const preferredRent =
    detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent;
  const preferredLeaseType = detail.preferredLeaseType;
  const fixedTermWeeks = detail.fixedTermWeeks;
  const fixedTermEndDate = detail.newAgreementEnd;

  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-4 text-sm font-semibold">Agent decision</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Preferred rent value</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatCurrency(preferredRent)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Preferred lease term</dt>
            <dd className="mt-0.5 font-medium">
              {formatRentReviewTermLabel(preferredLeaseType, fixedTermWeeks)}
              {preferredLeaseType === 'fixed' && fixedTermEndDate
                ? ` · ends ${formatDate(fixedTermEndDate)}`
                : ''}
            </dd>
          </div>
        </dl>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Preferred lease type</dt>
            <dd className="mt-0.5 font-medium capitalize">{preferredLeaseType ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Negotiable</dt>
            <dd className="mt-0.5 font-medium">
              {detail.rentNegotiable === true
                ? 'Yes'
                : detail.rentNegotiable === false
                  ? 'No'
                  : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function CompletedTenantDecisionSection({ detail }: { detail: RentReviewWorkflowDetail }) {
  const accepted = isTenantAccepted(detail);
  const declined = isTenantDeclined(detail);
  const acceptance = buildTenantAcceptanceSummary(detail);
  const counterAccepted = detail.auditLog.some((e) => e.kind === 'agent_accepted_tenant_counter');

  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-4 text-sm font-semibold">Tenant decision</p>

      {accepted && acceptance ? (
        <div className="space-y-3">
          <p className="text-primary text-xs font-semibold uppercase">
            {counterAccepted ? 'Accepted — agent accepted counter-offer' : 'Accepted proposed terms'}
          </p>
          <RentReviewTenantAcceptanceSummary summary={acceptance} />
          {isPreferredRenewalFixed(detail) ? (
            <RentReviewSignedLeaseAgreementCard detail={detail} />
          ) : null}
        </div>
      ) : null}

      {declined ? (
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Outcome</dt>
            <dd className="mt-0.5 font-medium text-rose-600 dark:text-rose-400">
              Declined — vacate path
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Move-out date</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {detail.tenantMoveOutDate ? formatDate(detail.tenantMoveOutDate) : '—'}
            </dd>
          </div>
        </dl>
      ) : null}

      {!accepted && !declined ? (
        <p className="text-muted-foreground text-xs">No tenant decision recorded yet.</p>
      ) : null}
    </section>
  );
}

/** Read-only recap of research, agent decision, and tenant decision on the Completed step. */
export function RentReviewCompletedCaseSummary({
  detail,
}: {
  detail: RentReviewWorkflowDetail;
}) {
  return (
    <div className="space-y-4">
      <CompletedResearchSection detail={detail} />
      <CompletedAgentDecisionSection detail={detail} />
      <CompletedTenantDecisionSection detail={detail} />
    </div>
  );
}
