'use client';

import type { ReactNode } from 'react';

import { TrustLoadError, TrustLoading, TrustPanel } from '@/components/agent/trust/trust-ui';
import { TRUST_LEDGER_KIND, type TrustLedgerKind } from '@/constants/trust';
import { TRUST_LEDGER_SUMMARY_COPY as COPY } from '@/constants/trust-invoices';
import { useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustLedgerSummary } from '@/lib/crossub-api/agent-trust-invoices-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

/**
 * This month in, out and net on an owner, supplier or agency folio; an owner also shows what is
 * reserved for bills, withheld and available to pay. `reloadKey` changes after an edit elsewhere
 * on the ledger page.
 */
export function TrustLedgerSummaryPanel({
  agencyId,
  ledgerId,
  kind,
  reloadKey,
}: {
  agencyId: string;
  ledgerId: string;
  kind: TrustLedgerKind;
  reloadKey: string;
}) {
  const { data, error, loading, reload } = useTrustResource(`${agencyId}:${ledgerId}:${reloadKey}`, () =>
    fetchTrustLedgerSummary(agencyId, ledgerId),
  );
  const isOwner = kind === TRUST_LEDGER_KIND.OWNER;

  return (
    <TrustPanel title={COPY.title}>
      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : (
        <dl className="space-y-1 text-sm">
          <Line label={COPY.moneyIn} value={formatCents(data.monthInCents)} />
          <Line label={COPY.moneyOut} value={formatCents(data.monthOutCents)} />
          <Line label={COPY.net} value={formatCents(data.monthNetCents)} strong />
          {isOwner ? (
            <>
              <div className="border-t pt-1" />
              <Line label={COPY.reserved} value={formatCents(data.reservedCents)} />
              <Line
                label={COPY.withheld}
                value={formatCents(data.withheldCents)}
                tone={data.withheldCents > 0 ? 'text-amber-700 dark:text-amber-300' : undefined}
              />
              <Line
                label={COPY.availableToPay}
                value={formatCents(data.availableToPayCents)}
                tone={data.availableToPayCents < 0 ? 'text-destructive' : undefined}
                strong
              />
              <p className="text-muted-foreground pt-1 text-xs">
                {[
                  data.pendingBillCount > 0 ? COPY.pendingBills(data.pendingBillCount) : null,
                  data.pendingFeeCount > 0 ? COPY.pendingFees(data.pendingFeeCount, formatCents(data.pendingFeeCents)) : null,
                  data.nextPayoutDue ? COPY.nextPayout(formatTrustDate(data.nextPayoutDue)) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </>
          ) : null}
        </dl>
      )}
    </TrustPanel>
  );
}

function Line({ label, value, tone, strong }: { label: string; value: ReactNode; tone?: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('tabular-nums', strong && 'font-semibold', tone)}>{value}</dd>
    </div>
  );
}
