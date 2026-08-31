'use client';

import { tenantResponseSummary } from '@/lib/rent-review-task-detail';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { formatCurrency, formatDate } from '@/lib/utils';

/** Read-only view of what the tenant submitted in the tenant portal. */
export function RentReviewTenantPortalResponseCard({
  detail,
  embedded,
}: {
  detail: RentReviewWorkflowDetail;
  embedded?: boolean;
}) {
  const response = tenantResponseSummary(detail);

  return (
    <section className={embedded ? undefined : 'rounded-xl border bg-card p-4'}>
      <p className="text-xs font-semibold uppercase tracking-wide">Tenant response</p>
      <p className="text-muted-foreground mt-1 text-xs">
        {response
          ? 'Submitted by the tenant in the tenant portal.'
          : 'The tenant responds in the tenant portal. This is not recorded by the agent.'}
      </p>

      {response ? (
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Decision</dt>
            <dd className="mt-0.5 font-semibold">{response.status}</dd>
          </div>
          {response.at ? (
            <div>
              <dt className="text-muted-foreground text-xs">Responded</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{formatDate(response.at)}</dd>
            </div>
          ) : null}
          {response.counterWeekly != null ? (
            <div>
              <dt className="text-muted-foreground text-xs">Counter-offer</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {formatCurrency(response.counterWeekly)}/wk
              </dd>
            </div>
          ) : null}
          {response.moveOutDate ? (
            <div>
              <dt className="text-muted-foreground text-xs">Move-out date</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {formatDate(response.moveOutDate)}
              </dd>
            </div>
          ) : null}
          {response.reason ? (
            <div>
              <dt className="text-muted-foreground text-xs">Reason</dt>
              <dd className="mt-0.5">{response.reason}</dd>
            </div>
          ) : null}
          {response.comments ? (
            <div>
              <dt className="text-muted-foreground text-xs">Comments</dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{response.comments}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          Waiting for the tenant to accept, decline, or counter in the tenant portal.
        </p>
      )}
    </section>
  );
}
