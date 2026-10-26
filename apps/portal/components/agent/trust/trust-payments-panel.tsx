'use client';

import { useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
  TrustPill,
} from '@/components/agent/trust/trust-ui';
import { TRUST_LEDGERS_COPY, TRUST_PAGE_SIZE_MAX } from '@/constants/trust';
import {
  TRUST_PAYMENT_STAGE_ALL,
  TRUST_PAYMENT_STAGE_FILTERS,
  TRUST_PAYMENT_STATUS_LABEL,
  TRUST_PAYMENT_STATUS_TONE,
  TRUST_PAYMENTS_COPY as COPY,
  TRUST_WITHDRAWAL_METHOD_LABEL,
  type TrustPaymentStageFilter,
} from '@/constants/trust-transactions';
import { useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustPayments } from '@/lib/crossub-api/agent-trust-transactions-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

/**
 * Every bank payment on the trust account, newest first (the staff Withdrawals list): manual
 * withdrawals, bill payments and disbursement payouts, waiting for a bank file or done.
 */
export function TrustPaymentsPanel({
  agencyId,
  bankAccountId,
  refreshKey,
}: {
  agencyId: string;
  bankAccountId: string;
  /** Reloads the list when it changes (a new bank file moves payments out of waiting). */
  refreshKey?: string | number;
}) {
  const [stage, setStage] = useState<TrustPaymentStageFilter>(TRUST_PAYMENT_STAGE_ALL);
  const payments = useTrustResource(`${agencyId}:${bankAccountId}:payments:${stage}:${refreshKey ?? ''}`, () =>
    fetchTrustPayments(agencyId, bankAccountId, {
      pageSize: TRUST_PAGE_SIZE_MAX,
      stage: stage === TRUST_PAYMENT_STAGE_ALL ? undefined : stage,
    }),
  );
  const data = payments.data;

  return (
    <TrustPanel title={COPY.title}>
      <div className="space-y-3">
        <FilterChips options={TRUST_PAYMENT_STAGE_FILTERS} value={stage} onChange={setStage} />
        {!data ? (
          payments.error ? (
            <TrustLoadError error={payments.error} onRetry={payments.reload} />
          ) : (
            <TrustLoading />
          )
        ) : data.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{COPY.empty}</p>
        ) : (
          <>
            <p className="text-muted-foreground text-xs">
              {COPY.counts(data.counts.eft, data.counts.bpay, data.counts.cheque)}
            </p>
            <div className={cn('-mx-4 -mb-4 overflow-x-auto', payments.loading && 'opacity-60')}>
              <table className="w-full border-collapse text-sm">
                <thead className="border-b">
                  <tr>
                    <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
                    <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.payee}</th>
                    <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.ledger}</th>
                    <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.method}</th>
                    <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
                    <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-b-0">
                      <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                        {formatTrustDate(payment.effectiveDate)}
                      </td>
                      <td className={TRUST_TABLE_CELL_CLASS}>
                        <p className="font-medium">{payment.payeeName}</p>
                        <p className="text-muted-foreground text-xs md:hidden">{payment.ledger.name}</p>
                      </td>
                      <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden md:table-cell')}>
                        <p>{payment.ledger.name}</p>
                        <p className="text-muted-foreground text-xs">{payment.ledger.code}</p>
                      </td>
                      <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>
                        <p>{TRUST_WITHDRAWAL_METHOD_LABEL[payment.method]}</p>
                        {payment.chequeNumber ? (
                          <p className="text-muted-foreground text-xs">{COPY.cheque(payment.chequeNumber)}</p>
                        ) : null}
                      </td>
                      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                        {formatCents(payment.amountCents)}
                      </td>
                      <td className={TRUST_TABLE_CELL_CLASS}>
                        <TrustPill className={TRUST_PAYMENT_STATUS_TONE[payment.status]}>
                          {TRUST_PAYMENT_STATUS_LABEL[payment.status]}
                        </TrustPill>
                        {payment.batchNumber != null ? (
                          <p className="text-muted-foreground mt-1 text-xs">{COPY.batch(payment.batchNumber)}</p>
                        ) : null}
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
          </>
        )}
      </div>
    </TrustPanel>
  );
}
