'use client';

import { useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { TrustNewTransactionMenu } from '@/components/agent/trust/trust-new-transaction-menu';
import { TrustTransactionDialog } from '@/components/agent/trust/trust-transaction-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustPill,
  TrustSearchInput,
} from '@/components/agent/trust/trust-ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_LEDGERS_COPY,
  TRUST_PAGE_COPY,
  TRUST_PAGE_SIZE_MAX,
  TRUST_PAYMENT_METHOD_LABEL,
  TRUST_TRANSACTION_CATEGORY_ALL,
  TRUST_TRANSACTION_CATEGORY_FILTERS,
  TRUST_TRANSACTION_DISPLAY_STATUS_LABEL,
  TRUST_TRANSACTION_DISPLAY_STATUS_TONE,
  TRUST_TRANSACTION_KIND_LABEL,
  TRUST_TRANSACTIONS_COPY as COPY,
  type TrustTransactionCategoryFilter,
} from '@/constants/trust';
import { useDebouncedValue, useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustTransactions, type TrustAccountCode } from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, trustTodayKey } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

/**
 * Every transaction on the trust account, newest first; open one to see its entries or reverse it.
 * "New transaction" posts a receipt, a withdrawal or a journal by hand.
 */
export function TrustTransactionsTab({
  agencyId,
  bankAccountId,
  accountCodes,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
}) {
  const [category, setCategory] = useState<TrustTransactionCategoryFilter>(
    TRUST_TRANSACTION_CATEGORY_ALL,
  );
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useDebouncedValue(search.trim());

  const { data, error, loading, reload } = useTrustResource(
    `${agencyId}:${bankAccountId}:${category}:${query}:${from}:${to}`,
    () =>
      fetchTrustTransactions(agencyId, bankAccountId, {
        pageSize: TRUST_PAGE_SIZE_MAX,
        category: category === TRUST_TRANSACTION_CATEGORY_ALL ? undefined : category,
        search: query || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-3">
        <TrustSearchInput value={search} onChange={setSearch} placeholder={COPY.searchPlaceholder} />
        <div className="flex gap-2">
          <div className="space-y-1">
            <Label htmlFor="trust-tx-from" className="text-xs">
              {COPY.from}
            </Label>
            <Input
              id="trust-tx-from"
              type="date"
              className="h-9 w-40"
              value={from}
              max={to || trustTodayKey()}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="trust-tx-to" className="text-xs">
              {COPY.to}
            </Label>
            <Input
              id="trust-tx-to"
              type="date"
              className="h-9 w-40"
              value={to}
              min={from || undefined}
              max={trustTodayKey()}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <FilterChips
            options={TRUST_TRANSACTION_CATEGORY_FILTERS}
            value={category}
            onChange={setCategory}
          />
        </div>
        <div className="shrink-0">
          <TrustNewTransactionMenu
            agencyId={agencyId}
            bankAccountId={bankAccountId}
            accountCodes={accountCodes}
            onPosted={reload}
          />
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
          {query || from || to ? TRUST_PAGE_COPY.noMatches : COPY.empty}
        </p>
      ) : (
        <div className={cn('overflow-x-auto rounded-xl border bg-card', loading && 'opacity-60')}>
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.audit}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.kind}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.description}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.method}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.status}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-muted/40 cursor-pointer border-b last:border-b-0"
                  onClick={() => setOpenId(tx.id)}
                >
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap tabular-nums')}>
                    <p className="font-medium">{COPY.auditNumber(tx.auditNumber)}</p>
                    {tx.receiptNumber != null ? (
                      <p className="text-muted-foreground text-xs">
                        {COPY.receiptNumber(tx.receiptNumber)}
                      </p>
                    ) : null}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                    {formatTrustDate(tx.effectiveDate)}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden md:table-cell')}>
                    {TRUST_TRANSACTION_KIND_LABEL[tx.kind]}
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p className="font-medium">{tx.description}</p>
                    {tx.partyName ? (
                      <p className="text-muted-foreground text-xs">{tx.partyName}</p>
                    ) : null}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>
                    {tx.method ? TRUST_PAYMENT_METHOD_LABEL[tx.method] : '—'}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                    {formatCents(tx.cashAmountCents)}
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <TrustPill className={TRUST_TRANSACTION_DISPLAY_STATUS_TONE[tx.displayStatus]}>
                      {TRUST_TRANSACTION_DISPLAY_STATUS_LABEL[tx.displayStatus]}
                    </TrustPill>
                    <p className="text-muted-foreground mt-1 hidden text-xs xl:block">
                      {tx.bankLine ? COPY.reconciled : COPY.notReconciled}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > data.items.length ? (
            <p className="text-muted-foreground border-t px-3 py-2 text-xs">
              {TRUST_LEDGERS_COPY.showing(data.items.length, data.total)}
            </p>
          ) : null}
        </div>
      )}

      {openId ? (
        <TrustTransactionDialog
          key={openId}
          agencyId={agencyId}
          transactionId={openId}
          onClose={() => setOpenId(null)}
          onReversed={reload}
        />
      ) : null}
    </div>
  );
}
