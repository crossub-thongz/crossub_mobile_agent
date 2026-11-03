'use client';

import { useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { TrustLedgerDetail } from '@/components/agent/trust/trust-ledger-detail';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustSearchInput,
} from '@/components/agent/trust/trust-ui';
import {
  TRUST_LEDGER_KIND_ALL,
  TRUST_LEDGER_KIND_FILTERS,
  TRUST_LEDGER_KIND_LABEL,
  TRUST_LEDGERS_COPY as COPY,
  TRUST_PAGE_COPY,
  TRUST_PAGE_SIZE_MAX,
  type TrustLedgerKindFilter,
} from '@/constants/trust';
import { useDebouncedValue, useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustLedgers, type TrustAccountCode } from '@/lib/crossub-api/agent-trust-client';
import { formatCents } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

export function TrustLedgersTab({
  agencyId,
  bankAccountId,
  accountCodes,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
}) {
  const [kind, setKind] = useState<TrustLedgerKindFilter>(TRUST_LEDGER_KIND_ALL);
  const [search, setSearch] = useState('');
  const [openLedgerId, setOpenLedgerId] = useState<string | null>(null);
  const query = useDebouncedValue(search.trim());

  const { data, error, loading, reload } = useTrustResource(
    `${agencyId}:${bankAccountId}:${kind}:${query}`,
    () =>
      fetchTrustLedgers(agencyId, bankAccountId, {
        pageSize: TRUST_PAGE_SIZE_MAX,
        kind: kind === TRUST_LEDGER_KIND_ALL ? undefined : kind,
        search: query || undefined,
      }),
  );

  if (openLedgerId) {
    return (
      <TrustLedgerDetail
        agencyId={agencyId}
        ledgerId={openLedgerId}
        accountCodes={accountCodes}
        onBack={() => setOpenLedgerId(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <TrustSearchInput value={search} onChange={setSearch} placeholder={COPY.searchPlaceholder} />
        <div className="min-w-0 flex-1">
          <FilterChips options={TRUST_LEDGER_KIND_FILTERS} value={kind} onChange={setKind} />
        </div>
      </div>

      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          {query || kind !== TRUST_LEDGER_KIND_ALL ? TRUST_PAGE_COPY.noMatches : COPY.empty}
        </p>
      ) : (
        <div className={cn('overflow-x-auto rounded-xl border bg-card', loading && 'opacity-60')}>
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.code}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.name}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.kind}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.property}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.balance}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((ledger) => (
                <tr
                  key={ledger.id}
                  tabIndex={0}
                  className="hover:bg-secondary/50 cursor-pointer border-b last:border-b-0"
                  onClick={() => setOpenLedgerId(ledger.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenLedgerId(ledger.id);
                    }
                  }}
                >
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'font-mono text-xs')}>{ledger.code}</td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p className="font-medium">{ledger.name}</p>
                    <p className="text-muted-foreground text-xs md:hidden">
                      {TRUST_LEDGER_KIND_LABEL[ledger.kind]}
                    </p>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden md:table-cell')}>
                    {TRUST_LEDGER_KIND_LABEL[ledger.kind]}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-muted-foreground hidden lg:table-cell')}>
                    {ledger.propertyReferenceAddress ?? ledger.propertyAddress ?? '—'}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                    {formatCents(ledger.balanceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > data.items.length ? (
            <p className="text-muted-foreground border-t px-3 py-2 text-xs">
              {COPY.showing(data.items.length, data.total)}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
