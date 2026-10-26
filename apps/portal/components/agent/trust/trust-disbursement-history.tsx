'use client';

import { TrustLoadError, TrustLoading, TrustPanel } from '@/components/agent/trust/trust-ui';
import {
  TRUST_DISBURSEMENT_HISTORY_COPY as COPY,
  TRUST_DISBURSEMENT_KIND_LABEL,
  TRUST_PAGE_SIZE_MAX,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustDisbursements } from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';

/** Past disbursement runs, newest first; `refreshKey` reloads after a new run. */
export function TrustDisbursementHistory({
  agencyId,
  bankAccountId,
  refreshKey,
}: {
  agencyId: string;
  bankAccountId: string;
  refreshKey: number;
}) {
  const { data, error, loading, reload } = useTrustResource(
    `${agencyId}:${bankAccountId}:runs:${refreshKey}`,
    () => fetchTrustDisbursements(agencyId, bankAccountId, { pageSize: TRUST_PAGE_SIZE_MAX }),
  );

  return (
    <TrustPanel title={COPY.title}>
      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.empty}</p>
      ) : (
        <ul className="divide-y text-sm">
          {data.items.map((run) => (
            <li key={run.id} className="flex flex-wrap items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium">
                  {COPY.run(run.runNumber)} · {TRUST_DISBURSEMENT_KIND_LABEL[run.kind]}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatTrustDate(run.disbursementDate)}
                  {run.createdByName ? ` · ${COPY.by(run.createdByName)}` : ''}
                </p>
              </div>
              <p className="text-muted-foreground text-xs tabular-nums">
                {COPY.summary(run.paidCount, run.skippedCount, formatCents(run.payoutCents))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </TrustPanel>
  );
}
