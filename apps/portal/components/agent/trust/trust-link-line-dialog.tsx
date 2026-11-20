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
  TRUST_LINK_LINE_WINDOW_DAYS,
  TRUST_PAGE_SIZE_MAX,
  TRUST_TRANSACTION_CATEGORY,
  TRUST_TRANSACTION_DISPLAY_STATUS,
  TRUST_TRANSACTIONS_COPY,
} from '@/constants/trust';
import {
  TRUST_BANK_WORKSPACE_COPY,
  TRUST_MATCH_LINE_COPY as COPY,
} from '@/constants/trust-bank-workspace';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustTransactions,
  matchTrustBankLine,
  type MatchTrustBankLineInput,
  type TrustBankWorkspaceLine,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, shiftTrustDateKey, trustTodayKey } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { isMatchCandidate, matchBatchOptions } from '@/utils/trust-bank-workspace';

/**
 * PRD phase 5 (D159, D161): match a saved bank line to exactly one thing — an unreconciled posted
 * receipt or withdrawal of the same signed amount nearby, or (a debit) the payment batch whose
 * total the bank paid as one debit. A cent out or the wrong way is never offered (UAT 16).
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
  line: TrustBankWorkspaceLine;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const today = trustTodayKey();
  const windowEnd = shiftTrustDateKey(line.lineDate, TRUST_LINK_LINE_WINDOW_DAYS);
  const { data, error, loading, reload } = useTrustResource(`${agencyId}:${line.id}:match`, () =>
    fetchTrustTransactions(agencyId, bankAccountId, {
      pageSize: TRUST_PAGE_SIZE_MAX,
      category:
        line.amountCents > 0 ? TRUST_TRANSACTION_CATEGORY.MONEY_IN : TRUST_TRANSACTION_CATEGORY.MONEY_OUT,
      from: shiftTrustDateKey(line.lineDate, -TRUST_LINK_LINE_WINDOW_DAYS),
      to: windowEnd < today ? windowEnd : today,
    }),
  );
  const candidates = (data?.items ?? []).filter((tx) =>
    isMatchCandidate(tx, line.amountCents, TRUST_TRANSACTION_DISPLAY_STATUS.UNRECONCILED),
  );
  const batches = matchBatchOptions(line);

  async function match(key: string, body: MatchTrustBankLineInput) {
    setPendingId(key);
    try {
      await matchTrustBankLine(agencyId, line.id, body);
      toast.success(TRUST_BANK_WORKSPACE_COPY.matched);
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
        {batches.map((batch) => (
          <div key={batch.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">
                {COPY.batch} · {TRUST_BANK_WORKSPACE_COPY.matchedBatch(batch.batchNumber, batch.paymentCount)}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatTrustDate(batch.processingDate)} · {formatCents(batch.totalCents)} · {COPY.batchHint}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={pendingId !== null}
              onClick={() => void match(batch.id, { paymentBatchId: batch.id })}
            >
              {pendingId === batch.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {COPY.choose}
            </Button>
          </div>
        ))}
        {!data ? (
          error ? (
            <TrustLoadError error={error} onRetry={reload} />
          ) : (
            <TrustLoading />
          )
        ) : candidates.length === 0 ? (
          batches.length > 0 ? null : <p className="text-muted-foreground text-sm">{COPY.empty}</p>
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
                      {tx.partyName ? <p className="text-muted-foreground text-xs">{tx.partyName}</p> : null}
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={pendingId !== null}
                        onClick={() => void match(tx.id, { transactionId: tx.id })}
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
