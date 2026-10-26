'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustLedgerSelect, useTrustOpenLedgers } from '@/components/agent/trust/trust-ledger-select';
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
import { Textarea } from '@/components/ui/textarea';
import {
  TRUST_FOLIO_MONEY_KINDS,
  TRUST_FOLIO_WITHDRAWAL_COPY as COPY,
  TRUST_NEW_TRANSACTION_COPY as FORM,
  TRUST_PAYMENT_STATUS_LABEL,
  TRUST_TRANSACTION_LIMITS as LIMITS,
  TRUST_WITHDRAWAL_METHOD,
  TRUST_WITHDRAWAL_METHOD_LABEL,
  TRUST_WITHDRAWAL_METHODS,
  type TrustWithdrawalMethod,
} from '@/constants/trust-transactions';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustPayoutMethods,
  type TrustAccountCode,
  type TrustLedger,
} from '@/lib/crossub-api/agent-trust-client';
import { postTrustManualWithdrawal } from '@/lib/crossub-api/agent-trust-transactions-client';
import { formatCents, newTrustIdempotencyKey, parseDollarsToCents, trustTodayKey } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import {
  trustIdempotencyKeyAfterError,
  trustManualWithdrawalInput,
  trustPayoutMethodDetail,
  trustSoleSavedPayoutMethod,
  type TrustWithdrawalDraft,
} from '@/utils/trust-transactions';

/** Every active account code, by code: a refund is booked under income, an owner payment under expense. */
function activeCodes(codes: readonly TrustAccountCode[]): TrustAccountCode[] {
  return codes.filter((code) => code.isActive).sort((a, b) => a.code.localeCompare(b.code));
}

type DraftFields = Omit<TrustWithdrawalDraft, 'idempotencyKey' | 'ledger' | 'savedMethod'>;

const EMPTY_FIELDS = (): DraftFields => ({
  accountCodeId: '',
  date: trustTodayKey(),
  payeeName: '',
  method: TRUST_WITHDRAWAL_METHOD.EFT,
  bsb: '',
  accountNumber: '',
  bpayBillerCode: '',
  bpayReference: '',
  chequeNumber: '',
  amount: '',
  gst: '',
  note: '',
});

/**
 * A withdrawal by hand from one owner, supplier or agency ledger as one bank payment (the staff
 * "Folio withdraw", D66 and D101). Bank transfer and BPAY wait for the next bank file; a cheque
 * is recorded with its number. A ledger whose one saved payout method takes 100% can be paid to
 * those details without retyping them. Mount it per open.
 */
export function TrustFolioWithdrawalDialog({
  agencyId,
  bankAccountId,
  accountCodes,
  onClose,
  onPosted,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
  onClose: () => void;
  onPosted: () => void;
}) {
  const ledgers = useTrustOpenLedgers(agencyId, bankAccountId, TRUST_FOLIO_MONEY_KINDS);
  const codes = activeCodes(accountCodes);

  const [ledger, setLedger] = useState<TrustLedger | null>(null);
  const [fields, setFields] = useState<DraftFields>(EMPTY_FIELDS);
  const [useSaved, setUseSaved] = useState(true);
  const [idempotencyKey, setIdempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);

  const payout = useTrustResource(ledger ? `${agencyId}:${ledger.id}:payout` : null, () =>
    fetchTrustPayoutMethods(agencyId, ledger?.id ?? ''),
  );
  const saved = ledger && payout.data?.ledger.id === ledger.id ? trustSoleSavedPayoutMethod(payout.data) : null;
  const savedMethod = saved && useSaved ? saved : null;
  const method: TrustWithdrawalMethod = savedMethod?.method ?? fields.method;

  const set = (patch: Partial<DraftFields>) => setFields((prev) => ({ ...prev, ...patch }));

  async function onSubmit() {
    const checked = trustManualWithdrawalInput({ ...fields, idempotencyKey, ledger, savedMethod });
    if (!checked.ok) {
      toast.error(checked.error);
      return;
    }
    setPending(true);
    try {
      const payment = await postTrustManualWithdrawal(agencyId, bankAccountId, checked.value);
      toast.success(COPY.done(formatCents(payment.amountCents), TRUST_PAYMENT_STATUS_LABEL[payment.status]));
      onPosted();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setIdempotencyKey((current) => trustIdempotencyKeyAfterError(err, current));
    } finally {
      setPending(false);
    }
  }

  const noLedgers = ledgers.data != null && ledgers.data.length === 0;
  const amountCents = parseDollarsToCents(fields.amount);
  const overBalance = ledger != null && amountCents != null && amountCents > ledger.balanceCents;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{COPY.title}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {ledgers.error ? <p className="text-destructive text-sm">{apiErrorMessage(ledgers.error)}</p> : null}
          <div className="space-y-1.5">
            <Label htmlFor="trust-withdrawal-ledger">{COPY.ledger}</Label>
            <TrustLedgerSelect
              id="trust-withdrawal-ledger"
              ledgers={ledgers.data ?? []}
              value={ledger}
              disabled={pending || ledgers.loading || noLedgers}
              onChange={(next) => {
                setLedger(next);
                setUseSaved(true);
              }}
            />
            {noLedgers ? <p className="text-muted-foreground text-xs">{FORM.noLedgers}</p> : null}
            {ledger ? (
              <p className="text-muted-foreground text-xs tabular-nums">{FORM.balance(formatCents(ledger.balanceCents))}</p>
            ) : null}
          </div>

          {saved ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={useSaved}
                disabled={pending}
                onChange={(e) => setUseSaved(e.target.checked)}
              />
              {COPY.useSaved(saved.payeeName, TRUST_WITHDRAWAL_METHOD_LABEL[saved.method], trustPayoutMethodDetail(saved))}
            </label>
          ) : null}

          {savedMethod ? null : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="trust-withdrawal-payee">{COPY.payee}</Label>
                <Input
                  id="trust-withdrawal-payee"
                  value={fields.payeeName}
                  maxLength={LIMITS.payeeNameMax}
                  disabled={pending}
                  onChange={(e) => set({ payeeName: e.target.value })}
                  placeholder={COPY.payeePlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trust-withdrawal-method">{COPY.method}</Label>
                <select
                  id="trust-withdrawal-method"
                  className={SELECT_CLASS}
                  value={fields.method}
                  disabled={pending}
                  onChange={(e) => set({ method: e.target.value as TrustWithdrawalMethod })}
                >
                  {TRUST_WITHDRAWAL_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {TRUST_WITHDRAWAL_METHOD_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {savedMethod ? null : method === TRUST_WITHDRAWAL_METHOD.EFT ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="trust-withdrawal-bsb">{COPY.bsb}</Label>
                <Input
                  id="trust-withdrawal-bsb"
                  inputMode="numeric"
                  value={fields.bsb}
                  placeholder="062-000"
                  disabled={pending}
                  onChange={(e) => set({ bsb: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trust-withdrawal-account">{COPY.accountNumber}</Label>
                <Input
                  id="trust-withdrawal-account"
                  inputMode="numeric"
                  autoComplete="off"
                  value={fields.accountNumber}
                  disabled={pending}
                  onChange={(e) => set({ accountNumber: e.target.value })}
                />
              </div>
            </div>
          ) : method === TRUST_WITHDRAWAL_METHOD.BPAY ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="trust-withdrawal-biller">{COPY.billerCode}</Label>
                <Input
                  id="trust-withdrawal-biller"
                  inputMode="numeric"
                  value={fields.bpayBillerCode}
                  maxLength={LIMITS.bpayBillerCodeMax}
                  disabled={pending}
                  onChange={(e) => set({ bpayBillerCode: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trust-withdrawal-bpay-ref">{COPY.bpayReference}</Label>
                <Input
                  id="trust-withdrawal-bpay-ref"
                  inputMode="numeric"
                  value={fields.bpayReference}
                  maxLength={LIMITS.bpayReferenceMax}
                  disabled={pending}
                  onChange={(e) => set({ bpayReference: e.target.value })}
                />
              </div>
            </div>
          ) : null}

          {method === TRUST_WITHDRAWAL_METHOD.CHEQUE ? (
            <div className="space-y-1.5">
              <Label htmlFor="trust-withdrawal-cheque">{COPY.chequeNumber}</Label>
              <Input
                id="trust-withdrawal-cheque"
                value={fields.chequeNumber}
                maxLength={LIMITS.chequeNumberMax}
                disabled={pending}
                onChange={(e) => set({ chequeNumber: e.target.value })}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-withdrawal-amount">{FORM.amount}</Label>
              <Input
                id="trust-withdrawal-amount"
                inputMode="decimal"
                value={fields.amount}
                disabled={pending}
                onChange={(e) => set({ amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-withdrawal-gst">{FORM.gst}</Label>
              <Input
                id="trust-withdrawal-gst"
                inputMode="decimal"
                value={fields.gst}
                disabled={pending}
                onChange={(e) => set({ gst: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          {overBalance ? <p className="text-xs text-amber-700 dark:text-amber-300">{COPY.overBalance}</p> : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-withdrawal-code">{FORM.accountCode}</Label>
              <select
                id="trust-withdrawal-code"
                className={SELECT_CLASS}
                value={fields.accountCodeId}
                disabled={pending}
                onChange={(e) => set({ accountCodeId: e.target.value })}
              >
                <option value="">{FORM.noAccountCode}</option>
                {codes.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.code} · {code.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-withdrawal-date">{FORM.date}</Label>
              <Input
                id="trust-withdrawal-date"
                type="date"
                value={fields.date}
                max={trustTodayKey()}
                disabled={pending}
                onChange={(e) => set({ date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trust-withdrawal-note">{COPY.note}</Label>
            <Textarea
              id="trust-withdrawal-note"
              rows={2}
              value={fields.note}
              maxLength={LIMITS.detailsMax}
              disabled={pending}
              onChange={(e) => set({ note: e.target.value })}
              placeholder={COPY.notePlaceholder}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {FORM.cancel}
          </Button>
          <Button type="button" disabled={pending || ledgers.loading || noLedgers} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit(amountCents != null && amountCents > 0 ? formatCents(amountCents) : null)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
