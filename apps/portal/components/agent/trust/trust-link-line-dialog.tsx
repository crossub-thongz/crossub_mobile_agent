'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TRUST_BANK_STATEMENT_COPY,
  TRUST_LINK_LINE_COPY as COPY,
  TRUST_LINK_LINE_WINDOW_DAYS,
  TRUST_PAGE_SIZE_MAX,
  TRUST_TRANSACTION_CATEGORY,
  TRUST_TRANSACTIONS_COPY,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustTransactions,
  linkTrustBankLine,
  type TrustBankFileLine,
} from '@/lib/crossub-api/agent-trust-client';
import {
  isPostedOriginalTrustTransaction,
  formatCents,
  formatTrustDate,
  shiftTrustDateKey,
  trustBankLineInput,
  trustTodayKey,
} from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Match an unmatched bank line to the posted receipt or withdrawal it is: same amount, not yet
 * on a statement, dated within a month either side.
 */
export function TrustLinkLineDialog({
  agencyId,
  bankAccountId,
  line,
  onClose,
  onLinked,
}: {
  agencyId: string;
  bankAccountId: string;
  line: TrustBankFileLine;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const today = trustTodayKey();
  const windowEnd = shiftTrustDateKey(line.lineDate, TRUST_LINK_LINE_WINDOW_DAYS);
  const { data, error, loading, reload } = useTrustResource(`${agencyId}:${line.key}`, () =>
    fetchTrustTransactions(agencyId, bankAccountId, {
      pageSize: TRUST_PAGE_SIZE_MAX,
      category:
        line.amountCents > 0 ? TRUST_TRANSACTION_CATEGORY.MONEY_IN : TRUST_TRANSACTION_CATEGORY.MONEY_OUT,
      reconciled: false,
      from: shiftTrustDateKey(line.lineDate, -TRUST_LINK_LINE_WINDOW_DAYS),
      to: windowEnd < today ? windowEnd : today,
    }),
  );
  const candidates = (data?.items ?? []).filter(
    (tx) => tx.cashAmountCents === line.amountCents && isPostedOriginalTrustTransaction(tx),
  );

  async function link(transactionId: string) {
    setPendingId(transactionId);
    try {
      await linkTrustBankLine(agencyId, bankAccountId, {
        bankLine: trustBankLineInput(line),
        transactionId,
      });
      toast.success(TRUST_BANK_STATEMENT_COPY.linked);
      onLinked();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pendingId) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{COPY.title}</DialogTitle>
          <DialogDescription>
            {line.memo} · {COPY.description(formatCents(line.amountCents), formatTrustDate(line.lineDate))}
          </DialogDescription>
        </DialogHeader>
        {!data ? (
          error ? (
            <TrustLoadError error={error} onRetry={reload} />
          ) : (
            <TrustLoading />
          )
        ) : candidates.length === 0 ? (
          <p className="text-muted-foreground text-sm">{COPY.empty}</p>
        ) : (
          <div className={cn('max-h-[50vh] overflow-auto rounded-lg border', loading && 'opacity-60')}>
            <table className="w-full border-collapse text-sm">
              <thead className="border-b">
                <tr>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{TRUST_TRANSACTIONS_COPY.audit}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{TRUST_TRANSACTIONS_COPY.date}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{TRUST_TRANSACTIONS_COPY.description}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS} />
                </tr>
              </thead>
              <tbody>
                {candidates.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-b-0">
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'tabular-nums')}>
                      {TRUST_TRANSACTIONS_COPY.auditNumber(tx.auditNumber)}
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                      {formatTrustDate(tx.effectiveDate)}
                    </td>
                    <td className={TRUST_TABLE_CELL_CLASS}>
                      <p className="font-medium">{tx.description}</p>
                      {tx.partyName ? (
                        <p className="text-muted-foreground text-xs">{tx.partyName}</p>
                      ) : null}
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={pendingId !== null}
                        onClick={() => void link(tx.id)}
                      >
                        {pendingId === tx.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        {COPY.choose}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pendingId !== null} onClick={onClose}>
            {COPY.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
