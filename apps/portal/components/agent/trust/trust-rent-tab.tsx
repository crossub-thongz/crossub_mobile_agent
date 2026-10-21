'use client';

import { useState } from 'react';

import { TrustReceiptDialog } from '@/components/agent/trust/trust-receipt-dialog';
import { TrustRentProfileDialog } from '@/components/agent/trust/trust-rent-profile-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustSearchInput,
  TrustStat,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import {
  TRUST_PAGE_COPY,
  TRUST_PAGE_SIZE_MAX,
  TRUST_RENT_COPY as COPY,
  TRUST_RENT_PERIOD_LABEL,
  TRUST_RENT_PROFILE_COPY as RENT_COPY,
} from '@/constants/trust';
import { useDebouncedValue, useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustRentList, type TrustRentRow } from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

function rentLabel(row: TrustRentRow): string {
  if (row.rentAmountCents == null || !row.rentPeriod) return '—';
  return COPY.rentPer(formatCents(row.rentAmountCents), TRUST_RENT_PERIOD_LABEL[row.rentPeriod]);
}

export function TrustRentTab({
  agencyId,
  bankAccountId,
}: {
  agencyId: string;
  bankAccountId: string;
}) {
  const [search, setSearch] = useState('');
  const [arrearsOnly, setArrearsOnly] = useState(false);
  const [receiptRow, setReceiptRow] = useState<TrustRentRow | null>(null);
  const [rentRow, setRentRow] = useState<TrustRentRow | null>(null);
  const query = useDebouncedValue(search.trim());

  const { data, error, loading, reload } = useTrustResource(
    `${agencyId}:${bankAccountId}:${arrearsOnly}:${query}`,
    () =>
      fetchTrustRentList(agencyId, bankAccountId, {
        pageSize: TRUST_PAGE_SIZE_MAX,
        search: query || undefined,
        arrearsOnly: arrearsOnly || undefined,
      }),
  );

  return (
    <div className="space-y-4">
      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TrustStat
            label={COPY.collectedThisMonth}
            value={formatCents(data.kpis.collectedThisMonthCents)}
          />
          <TrustStat
            label={COPY.inArrears}
            value={data.kpis.inArrearsCount}
            hint={formatCents(data.kpis.inArrearsCents)}
            tone={data.kpis.inArrearsCount > 0 ? 'text-destructive' : undefined}
          />
          <TrustStat label={COPY.paidInAdvance} value={data.kpis.paidInAdvanceCount} />
          <TrustStat label={COPY.noRentSetup} value={data.kpis.noRentSetupCount} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <TrustSearchInput value={search} onChange={setSearch} placeholder={COPY.searchPlaceholder} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={arrearsOnly}
            onChange={(e) => setArrearsOnly(e.target.checked)}
          />
          {COPY.arrearsOnly}
        </label>
      </div>

      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          {query || arrearsOnly ? TRUST_PAGE_COPY.noMatches : COPY.empty}
        </p>
      ) : (
        <div className={cn('overflow-x-auto rounded-xl border bg-card', loading && 'opacity-60')}>
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.tenant}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.property}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.rent}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.paidTo}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.arrears}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden text-right lg:table-cell')}>
                  {COPY.lastReceipt}
                </th>
                <th className={TRUST_TABLE_HEAD_CLASS} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.ledgerId} className="border-b last:border-b-0">
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p className="font-medium">{row.ledgerName}</p>
                    <p className="text-muted-foreground font-mono text-xs">{row.ledgerCode}</p>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-muted-foreground hidden lg:table-cell')}>
                    {row.propertyReferenceAddress ?? row.propertyAddress ?? '—'}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden whitespace-nowrap md:table-cell')}>
                    {rentLabel(row)}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                    {formatTrustDate(row.effectivePaidToDate ?? row.paidToDate)}
                  </td>
                  <td
                    className={cn(
                      TRUST_TABLE_CELL_CLASS,
                      'text-right tabular-nums',
                      row.totalArrearsCents > 0 && 'text-destructive font-medium',
                    )}
                  >
                    {row.totalArrearsCents > 0 ? formatCents(row.totalArrearsCents) : '—'}
                  </td>
                  <td
                    className={cn(
                      TRUST_TABLE_CELL_CLASS,
                      'text-muted-foreground hidden text-right lg:table-cell',
                    )}
                  >
                    {row.lastReceiptDate ? (
                      <>
                        <span className="tabular-nums">{formatCents(row.lastReceiptAmountCents)}</span>
                        <span className="block text-xs">{formatTrustDate(row.lastReceiptDate)}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={row.hasRentProfile ? 'ghost' : 'outline'}
                        className="h-7 text-xs"
                        onClick={() => setRentRow(row)}
                      >
                        {row.hasRentProfile ? RENT_COPY.edit : RENT_COPY.setUp}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setReceiptRow(row)}
                      >
                        {COPY.receipt}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receiptRow ? (
        <TrustReceiptDialog
          key={receiptRow.ledgerId}
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          row={receiptRow}
          onClose={() => setReceiptRow(null)}
          onReceipted={reload}
        />
      ) : null}

      {rentRow ? (
        <TrustRentProfileDialog
          key={rentRow.ledgerId}
          agencyId={agencyId}
          row={rentRow}
          onClose={() => setRentRow(null)}
          onSaved={reload}
        />
      ) : null}
    </div>
  );
}
