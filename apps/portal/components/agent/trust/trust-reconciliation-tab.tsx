'use client';

import { Loader2, Lock, LockOpen } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { TrustBankBalancesPanel } from '@/components/agent/trust/trust-bank-balances-panel';
import {
  TrustLoadError,
  TrustLoading,
  TrustPanel,
  TrustPill,
  TrustReasonDialog,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_RECONCILIATION_COPY as COPY,
  TRUST_RECONCILIATION_STATUS,
  TRUST_RECONCILIATION_STATUS_LABEL,
  TRUST_RECONCILIATION_STATUS_TONE,
  TRUST_RECONCILIATION_UPKEEP_COPY as UPKEEP_COPY,
} from '@/constants/trust';
import { useDebouncedValue, useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustReconciliationFigures,
  fetchTrustReconciliationMonths,
  lockTrustReconciliationMonth,
  recordTrustBankBalance,
  revokeTrustReconciliationLock,
  type TrustReconciliationFigures,
  type TrustReconciliationMonth,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, parseDollarsToCents } from '@/lib/trust-accounting';
import { cn, formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { trustFolioBalancesCents } from '@/utils/trust-reconciliation';

export function TrustReconciliationTab({
  agencyId,
  bankAccountId,
}: {
  agencyId: string;
  bankAccountId: string;
}) {
  const months = useTrustResource(`${agencyId}:${bankAccountId}`, () =>
    fetchTrustReconciliationMonths(agencyId, bankAccountId),
  );
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [changes, setChanges] = useState(0);
  const onChanged = () => {
    months.reload();
    setChanges((n) => n + 1);
  };

  if (!months.data) {
    return months.error ? (
      <TrustLoadError error={months.error} onRetry={months.reload} />
    ) : (
      <TrustLoading />
    );
  }

  const list = months.data.months;
  const month = pickedMonth ?? months.data.monthToLock?.month ?? list[0]?.month ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <TrustPanel title={COPY.months}>
          {months.data.monthToLock ? (
            <p className="text-muted-foreground mb-2 text-xs">
              {COPY.monthToLock(months.data.monthToLock.label)}
            </p>
          ) : null}
          {list.length === 0 ? (
            <p className="text-muted-foreground text-sm">{COPY.noMonths}</p>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {list.map((m) => (
                <li key={m.month}>
                  <button
                    type="button"
                    onClick={() => setPickedMonth(m.month)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
                      m.month === month ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/60',
                    )}
                  >
                    <span className="font-medium">{m.label}</span>
                    <TrustPill className={TRUST_RECONCILIATION_STATUS_TONE[m.status]}>
                      {TRUST_RECONCILIATION_STATUS_LABEL[m.status]}
                    </TrustPill>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TrustPanel>

        {month ? (
          <MonthFigures
            key={`${month}:${changes}`}
            agencyId={agencyId}
            bankAccountId={bankAccountId}
            month={month}
            monthInfo={list.find((m) => m.month === month) ?? null}
            onChanged={onChanged}
          />
        ) : null}
      </div>
      <TrustBankBalancesPanel
        agencyId={agencyId}
        bankAccountId={bankAccountId}
        refreshKey={changes}
        onChanged={onChanged}
      />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3 py-1', strong && 'border-t pt-2 font-semibold')}>
      <dt className={strong ? undefined : 'text-muted-foreground'}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function MonthFigures({
  agencyId,
  bankAccountId,
  month,
  monthInfo,
  onChanged,
}: {
  agencyId: string;
  bankAccountId: string;
  month: string;
  monthInfo: TrustReconciliationMonth | null;
  onChanged: () => void;
}) {
  const [revoking, setRevoking] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const typedCents = parseDollarsToCents(useDebouncedValue(balanceInput), true);
  const figures = useTrustResource(`${agencyId}:${bankAccountId}:${month}:${typedCents ?? ''}`, () =>
    fetchTrustReconciliationFigures(agencyId, bankAccountId, month, {
      statementBalanceCents: typedCents ?? undefined,
    }),
  );
  const [recording, setRecording] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockNote, setLockNote] = useState('');
  const [locking, setLocking] = useState(false);

  const data = figures.data;
  if (!data) {
    return figures.error ? (
      <TrustLoadError error={figures.error} onRetry={figures.reload} />
    ) : (
      <TrustLoading />
    );
  }

  const open = data.status === TRUST_RECONCILIATION_STATUS.OPEN;
  const statementCents = typedCents ?? data.recordedBalanceCents ?? null;

  async function onRecord(current: TrustReconciliationFigures) {
    const cents = parseDollarsToCents(balanceInput, true);
    if (cents == null) {
      toast.error(COPY.balanceInvalid);
      return;
    }
    setRecording(true);
    try {
      await recordTrustBankBalance(agencyId, bankAccountId, current.asAt, { balanceCents: cents });
      toast.success(COPY.recorded);
      figures.reload();
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setRecording(false);
    }
  }

  async function onLock(current: TrustReconciliationFigures) {
    if (statementCents == null) {
      toast.error(COPY.balanceInvalid);
      return;
    }
    setLocking(true);
    try {
      await lockTrustReconciliationMonth(agencyId, bankAccountId, month, {
        bankStatementBalanceCents: statementCents,
        note: lockNote.trim() || undefined,
      });
      toast.success(COPY.locked(current.label));
      setLockOpen(false);
      setBalanceInput('');
      figures.reload();
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLocking(false);
    }
  }

  const { bank, cashBook, folios, result } = data;

  return (
    <div className={cn('space-y-4', figures.loading && 'opacity-70')}>
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{data.label}</p>
            <TrustPill className={TRUST_RECONCILIATION_STATUS_TONE[data.status]}>
              {TRUST_RECONCILIATION_STATUS_LABEL[data.status]}
            </TrustPill>
          </div>
          <p className="text-muted-foreground text-xs">
            {data.lockedAt
              ? COPY.lockedBy(data.lockedByName, formatDate(data.lockedAt))
              : COPY.asAt(formatTrustDate(data.asAt))}
          </p>
          {data.lockBlockerLabel && open ? (
            <p className="mt-1 text-xs text-amber-600">{data.lockBlockerLabel}</p>
          ) : null}
        </div>
        {open ? (
          <Button
            type="button"
            disabled={!data.canLock || statementCents == null || locking}
            onClick={() => setLockOpen(true)}
          >
            <Lock className="size-4" />
            {COPY.lock}
          </Button>
        ) : monthInfo?.canRevoke && monthInfo.lockId ? (
          <Button type="button" variant="outline" onClick={() => setRevoking(true)}>
            <LockOpen className="size-4" />
            {UPKEEP_COPY.revoke}
          </Button>
        ) : null}
      </div>

      {revoking && monthInfo?.lockId ? (
        <TrustReasonDialog
          title={UPKEEP_COPY.revokeTitle(data.label)}
          description={UPKEEP_COPY.revokeDescription}
          reasonLabel={UPKEEP_COPY.reason}
          reasonRequired={UPKEEP_COPY.reasonRequired}
          submitLabel={UPKEEP_COPY.revokeSubmit}
          cancelLabel={UPKEEP_COPY.cancel}
          destructive
          onSubmit={async (reason) => {
            await revokeTrustReconciliationLock(agencyId, monthInfo.lockId as string, { reason });
            toast.success(UPKEEP_COPY.revoked(data.label));
            onChanged();
          }}
          onClose={() => setRevoking(false)}
        />
      ) : null}

      {open ? (
        <TrustPanel title={COPY.recordTitle}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-rec-balance">{COPY.statementBalance}</Label>
              <Input
                id="trust-rec-balance"
                inputMode="decimal"
                className="h-9 w-48"
                value={balanceInput}
                disabled={recording}
                placeholder={(bank.suggestedStatementBalanceCents / 100).toFixed(2)}
                onChange={(e) => setBalanceInput(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={recording || typedCents == null}
              onClick={() => void onRecord(data)}
            >
              {recording ? <Loader2 className="size-4 animate-spin" /> : null}
              {COPY.record}
            </Button>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {COPY.asAt(formatTrustDate(data.asAt))} ·{' '}
            {COPY.suggested(formatCents(bank.suggestedStatementBalanceCents))}
            {data.recordedBalanceCents != null
              ? ` · ${COPY.recordedBalance(formatCents(data.recordedBalanceCents))}`
              : ''}
          </p>
        </TrustPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <TrustPanel title={COPY.bank}>
          <dl className="text-sm">
            <Row label={COPY.statementBalance} value={formatCents(bank.statementBalanceCents ?? statementCents)} />
            <Row label={COPY.unpresentedDeposits} value={formatCents(bank.unreconciledDepositsCents)} />
            <Row
              label={COPY.unpresentedWithdrawals}
              value={formatCents(bank.unreconciledWithdrawalsCents)}
            />
            <Row label={COPY.reconciledBalance} value={formatCents(bank.reconciledBalanceCents)} strong />
          </dl>
        </TrustPanel>
        <TrustPanel title={COPY.cashBook}>
          <dl className="text-sm">
            <Row label={COPY.broughtForward} value={formatCents(cashBook.broughtForwardCents)} />
            <Row label={COPY.receipts(cashBook.receiptsCount)} value={formatCents(cashBook.receiptsCents)} />
            <Row
              label={COPY.withdrawals(cashBook.withdrawalsCount)}
              value={formatCents(cashBook.withdrawalsCents)}
            />
            <Row label={COPY.closing} value={formatCents(cashBook.closingCents)} strong />
          </dl>
        </TrustPanel>
        <TrustPanel title={COPY.result}>
          <dl className="text-sm">
            <Row label={COPY.folios} value={formatCents(trustFolioBalancesCents(folios))} />
            {/* D136: the opening balance not on a ledger counts on the ledger side. */}
            {folios.openingUnallocatedCents !== 0 ? (
              <Row label={COPY.openingUnallocated} value={formatCents(folios.openingUnallocatedCents)} />
            ) : null}
            <Row
              label={COPY.bankVsCashBook}
              value={result.bankVsCashBookCents == null ? '—' : formatCents(result.bankVsCashBookCents)}
            />
            <Row label={COPY.cashBookVsFolios} value={formatCents(result.cashBookVsFoliosCents)} />
          </dl>
          <p
            className={cn(
              'mt-3 text-sm font-semibold',
              result.isReconciled == null
                ? 'text-muted-foreground font-normal'
                : result.isReconciled
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive',
            )}
          >
            {result.isReconciled == null
              ? COPY.enterBalance
              : result.isReconciled
                ? COPY.reconciled
                : COPY.outBy(formatCents(result.bankVsCashBookCents ?? result.cashBookVsFoliosCents))}
          </p>
        </TrustPanel>
      </div>

      <Dialog
        open={lockOpen}
        onOpenChange={(next) => {
          if (!next && !locking) setLockOpen(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{COPY.lockTitle(data.label)}</DialogTitle>
            <DialogDescription>{COPY.lockBody}</DialogDescription>
          </DialogHeader>
          <dl className="text-sm">
            <Row label={COPY.statementBalance} value={formatCents(statementCents)} />
          </dl>
          <div className="space-y-1.5">
            <Label htmlFor="trust-lock-note">{COPY.lockNote}</Label>
            <Input
              id="trust-lock-note"
              value={lockNote}
              disabled={locking}
              onChange={(e) => setLockNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={locking} onClick={() => setLockOpen(false)}>
              {COPY.cancel}
            </Button>
            <Button type="button" disabled={locking} onClick={() => void onLock(data)}>
              {locking ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              {COPY.lock}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
