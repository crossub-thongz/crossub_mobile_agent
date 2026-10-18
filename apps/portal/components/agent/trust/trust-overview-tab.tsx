'use client';

import { TrustLoadError, TrustLoading, TrustPanel, TrustStat } from '@/components/agent/trust/trust-ui';
import {
  TRUST_BANK_RECONCILIATION_STATUS,
  TRUST_LEDGER_KIND,
  TRUST_LEDGER_KIND_LABEL,
  TRUST_OVERVIEW_COPY as COPY,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustOverview } from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';

export function TrustOverviewTab({
  agencyId,
  bankAccountId,
}: {
  agencyId: string;
  bankAccountId: string;
}) {
  const { data, error, loading, reload } = useTrustResource(
    `${agencyId}:${bankAccountId}`,
    () => fetchTrustOverview(agencyId, bankAccountId),
  );

  if (!data) {
    return error ? <TrustLoadError error={error} onRetry={reload} /> : loading ? <TrustLoading /> : null;
  }

  const rec = data.trustBankAccount.reconciliation;
  const reconciled = rec.status === TRUST_BANK_RECONCILIATION_STATUS.RECONCILED;
  const tile = data.reconciliation;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TrustStat label={COPY.cashBook} value={formatCents(data.cashBookBalanceCents)} />
        <TrustStat label={COPY.ledgers} value={formatCents(data.ledgerBalanceCents)} />
        <TrustStat
          label={COPY.difference}
          value={formatCents(data.differenceCents)}
          tone={data.differenceCents === 0 ? undefined : 'text-destructive'}
        />
        <TrustStat
          label={COPY.reconciliation}
          value={reconciled ? COPY.reconciled : COPY.unreconciled}
          tone={reconciled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}
          hint={
            rec.asAt
              ? `${COPY.asAt(formatTrustDate(rec.asAt))}${
                  rec.outByCents ? ` · ${COPY.outBy(formatCents(rec.outByCents))}` : ''
                }`
              : COPY.noBankBalance
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TrustStat
          label={COPY.billsDue}
          value={`${data.billsDueCount} · ${formatCents(data.billsDueCents)}`}
          hint={data.billsInsufficientCount > 0 ? COPY.billsInsufficient(data.billsInsufficientCount) : undefined}
        />
        <TrustStat
          label={COPY.ownersDue}
          value={data.ownersDueCount}
          hint={
            data.ownersWithoutPayoutMethodCount > 0
              ? COPY.ownersWithoutPayout(data.ownersWithoutPayoutMethodCount)
              : undefined
          }
        />
        <TrustStat
          label={COPY.invoicesOutstanding}
          value={`${data.invoicesOutstandingCount} · ${formatCents(data.invoicesOutstandingCents)}`}
          hint={data.invoicesOverdueCount > 0 ? COPY.invoicesOverdue(data.invoicesOverdueCount) : undefined}
        />
        <TrustStat
          label={COPY.reconciliation}
          value={tile.lastLockedLabel ? COPY.lastLocked(tile.lastLockedLabel) : COPY.nothingLocked}
          hint={tile.monthsToLock > 0 ? COPY.monthsToLock(tile.monthsToLock) : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <TrustPanel title={`${COPY.today} · ${formatTrustDate(data.today.date)}`}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{COPY.moneyIn}</dt>
              <dd className="tabular-nums">{formatCents(data.today.moneyInCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{COPY.moneyOut}</dt>
              <dd className="tabular-nums">{formatCents(data.today.moneyOutCents)}</dd>
            </div>
          </dl>
          <p className="text-muted-foreground mt-4 mb-2 text-xs font-semibold uppercase tracking-wide">
            {COPY.ledgerCounts}
          </p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {(
              [
                [TRUST_LEDGER_KIND.OWNER, data.ledgerCounts.owner],
                [TRUST_LEDGER_KIND.TENANT, data.ledgerCounts.tenant],
                [TRUST_LEDGER_KIND.SUPPLIER, data.ledgerCounts.supplier],
                [TRUST_LEDGER_KIND.AGENCY, data.ledgerCounts.agency],
              ] as const
            ).map(([kind, count]) => (
              <div key={kind} className="flex justify-between gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5">
                <dt className="text-muted-foreground">{TRUST_LEDGER_KIND_LABEL[kind]}</dt>
                <dd className="font-medium tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        </TrustPanel>

        <TrustPanel title={COPY.recent}>
          {data.recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{COPY.noRecent}</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.recentTransactions.map((tx) => (
                <li key={tx.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tx.description}</p>
                    <p className="text-muted-foreground text-xs">
                      #{tx.auditNumber} · {formatTrustDate(tx.effectiveDate)}
                      {tx.partyName ? ` · ${tx.partyName}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums">{formatCents(tx.cashAmountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </TrustPanel>
      </div>
    </div>
  );
}
