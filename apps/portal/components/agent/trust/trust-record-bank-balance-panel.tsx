'use client';

import { Loader2 } from 'lucide-react';

import { TrustPanel } from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TRUST_RECONCILIATION_COPY as COPY, TRUST_RECORD_BALANCE_COPY as RECORD_COPY } from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustCashBookBalance } from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, trustTodayKey } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Record the bank statement balance for a day the agent picks (today or earlier). The cash book
 * on that day is read from the API and set against the balance being typed, so the difference
 * shows before anything is recorded.
 */
export function TrustRecordBankBalancePanel({
  agencyId,
  bankAccountId,
  date,
  onDateChange,
  balanceInput,
  onBalanceInputChange,
  typedCents,
  placeholderCents,
  recording,
  onRecord,
}: {
  agencyId: string;
  bankAccountId: string;
  /** The day the balance is for, YYYY-MM-DD. */
  date: string;
  onDateChange: (date: string) => void;
  balanceInput: string;
  onBalanceInputChange: (value: string) => void;
  /** The typed balance in cents, null until it parses. */
  typedCents: number | null;
  placeholderCents: number;
  recording: boolean;
  onRecord: () => void;
}) {
  const today = trustTodayKey();
  const dateOk = Boolean(date) && date <= today;
  const cashBook = useTrustResource(dateOk ? `${agencyId}:${bankAccountId}:cash-book:${date}` : null, () =>
    fetchTrustCashBookBalance(agencyId, bankAccountId, date),
  );
  // The previous day's figure stays in the hook while the next loads; only show the one asked for.
  const cashBookCents = cashBook.data?.date === date ? cashBook.data.cashBookBalanceCents : null;
  const differenceCents = typedCents != null && cashBookCents != null ? typedCents - cashBookCents : null;

  return (
    <TrustPanel title={COPY.recordTitle}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="trust-rec-date">{COPY.recordDate}</Label>
          <Input
            id="trust-rec-date"
            type="date"
            className="h-9 w-44"
            value={date}
            max={today}
            disabled={recording}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trust-rec-balance">{COPY.statementBalance}</Label>
          <Input
            id="trust-rec-balance"
            inputMode="decimal"
            className="h-9 w-48"
            value={balanceInput}
            disabled={recording}
            placeholder={(placeholderCents / 100).toFixed(2)}
            onChange={(e) => onBalanceInputChange(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={recording || typedCents == null || !dateOk}
          onClick={onRecord}
        >
          {recording ? <Loader2 className="size-4 animate-spin" /> : null}
          {COPY.record}
        </Button>
      </div>
      {cashBook.error ? (
        <p className="text-destructive mt-3 text-xs">{apiErrorMessage(cashBook.error)}</p>
      ) : dateOk ? (
        <dl className="mt-3 grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{RECORD_COPY.cashBookOn(formatTrustDate(date))}</dt>
          <dd className="text-right tabular-nums">{cashBookCents == null ? RECORD_COPY.empty : formatCents(cashBookCents)}</dd>
          <dt className="text-muted-foreground">{COPY.statementBalance}</dt>
          <dd className="text-right tabular-nums">{typedCents == null ? RECORD_COPY.empty : formatCents(typedCents)}</dd>
          <dt className="font-medium">{RECORD_COPY.difference}</dt>
          <dd
            className={cn(
              'text-right font-medium tabular-nums',
              differenceCents == null ? '' : differenceCents === 0 ? 'text-emerald-600' : 'text-amber-600',
            )}
          >
            {differenceCents == null ? RECORD_COPY.empty : formatCents(differenceCents)}
          </dd>
        </dl>
      ) : null}
      <p className="text-muted-foreground mt-2 text-xs">{RECORD_COPY.hint}</p>
    </TrustPanel>
  );
}
