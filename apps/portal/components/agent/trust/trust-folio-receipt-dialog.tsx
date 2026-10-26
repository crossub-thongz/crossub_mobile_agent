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
import {
  TRUST_PAYMENT_METHOD,
  TRUST_PAYMENT_METHOD_LABEL,
  TRUST_PAYMENT_METHODS,
  type TrustPaymentMethod,
} from '@/constants/trust';
import {
  TRUST_FOLIO_MONEY_KINDS,
  TRUST_FOLIO_RECEIPT_COPY as COPY,
  TRUST_NEW_TRANSACTION_COPY as FORM,
  TRUST_TRANSACTION_LIMITS as LIMITS,
} from '@/constants/trust-transactions';
import type { TrustAccountCode, TrustLedger } from '@/lib/crossub-api/agent-trust-client';
import { postTrustLedgerReceipt } from '@/lib/crossub-api/agent-trust-transactions-client';
import { feeCategoryCodes, formatCents, newTrustIdempotencyKey, trustTodayKey } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import {
  trustAmountWithGst,
  trustIdempotencyKeyAfterError,
  trustOptionalText,
  trustPostingDate,
  trustRequiredText,
} from '@/utils/trust-transactions';

/**
 * A receipt by hand into one owner, supplier or agency ledger (the staff "Folio receipt", D101).
 * Tenant money goes through Rent's receipt. Mount it per open.
 */
export function TrustFolioReceiptDialog({
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
  const incomeCodes = feeCategoryCodes(accountCodes);

  const [ledger, setLedger] = useState<TrustLedger | null>(null);
  const [amount, setAmount] = useState('');
  const [gst, setGst] = useState('');
  const [accountCodeId, setAccountCodeId] = useState('');
  const [date, setDate] = useState(trustTodayKey);
  const [party, setParty] = useState('');
  const [method, setMethod] = useState<TrustPaymentMethod>(TRUST_PAYMENT_METHOD.EFT);
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    if (!ledger) return void toast.error(FORM.ledgerRequired);
    const money = trustAmountWithGst(amount, gst);
    if (!money.ok) return void toast.error(money.error);
    const day = trustPostingDate(date);
    if (!day.ok) return void toast.error(day.error);
    const what = trustRequiredText(description, FORM.field.description, LIMITS.descriptionMax, FORM.descriptionRequired);
    if (!what.ok) return void toast.error(what.error);
    const from = trustOptionalText(party, FORM.field.party, LIMITS.partyNameMax);
    if (!from.ok) return void toast.error(from.error);
    const line = trustOptionalText(details, FORM.field.details, LIMITS.detailsMax);
    if (!line.ok) return void toast.error(line.error);

    setPending(true);
    try {
      const tx = await postTrustLedgerReceipt(agencyId, bankAccountId, {
        idempotencyKey,
        effectiveDate: day.value,
        method,
        description: what.value,
        partyName: from.value,
        lines: [
          {
            ledgerId: ledger.id,
            amountCents: money.value.amountCents,
            gstCents: money.value.gstCents,
            accountCodeId: accountCodeId || undefined,
            details: line.value,
          },
        ],
      });
      toast.success(COPY.done(tx.receiptNumber));
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
            <Label htmlFor="trust-folio-receipt-ledger">{FORM.ledger}</Label>
            <TrustLedgerSelect
              id="trust-folio-receipt-ledger"
              ledgers={ledgers.data ?? []}
              value={ledger}
              disabled={pending || ledgers.loading || noLedgers}
              onChange={setLedger}
            />
            {noLedgers ? <p className="text-muted-foreground text-xs">{FORM.noLedgers}</p> : null}
            {ledger ? (
              <p className="text-muted-foreground text-xs tabular-nums">{FORM.balance(formatCents(ledger.balanceCents))}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-folio-receipt-amount">{FORM.amount}</Label>
              <Input
                id="trust-folio-receipt-amount"
                inputMode="decimal"
                value={amount}
                disabled={pending}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-folio-receipt-gst">{FORM.gst}</Label>
              <Input
                id="trust-folio-receipt-gst"
                inputMode="decimal"
                value={gst}
                disabled={pending}
                onChange={(e) => setGst(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-folio-receipt-code">{FORM.accountCode}</Label>
              <select
                id="trust-folio-receipt-code"
                className={SELECT_CLASS}
                value={accountCodeId}
                disabled={pending}
                onChange={(e) => setAccountCodeId(e.target.value)}
              >
                <option value="">{FORM.noAccountCode}</option>
                {incomeCodes.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.code} · {code.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-folio-receipt-date">{FORM.date}</Label>
              <Input
                id="trust-folio-receipt-date"
                type="date"
                value={date}
                max={trustTodayKey()}
                disabled={pending}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-folio-receipt-party">{COPY.party}</Label>
              <Input
                id="trust-folio-receipt-party"
                value={party}
                maxLength={LIMITS.partyNameMax}
                disabled={pending}
                onChange={(e) => setParty(e.target.value)}
                placeholder={COPY.partyPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-folio-receipt-method">{COPY.method}</Label>
              <select
                id="trust-folio-receipt-method"
                className={SELECT_CLASS}
                value={method}
                disabled={pending}
                onChange={(e) => setMethod(e.target.value as TrustPaymentMethod)}
              >
                {TRUST_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {TRUST_PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-folio-receipt-description">{FORM.description}</Label>
            <Input
              id="trust-folio-receipt-description"
              value={description}
              maxLength={LIMITS.descriptionMax}
              disabled={pending}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={COPY.descriptionPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-folio-receipt-details">{FORM.details}</Label>
            <Input
              id="trust-folio-receipt-details"
              value={details}
              maxLength={LIMITS.detailsMax}
              disabled={pending}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={COPY.detailsPlaceholder}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {FORM.cancel}
          </Button>
          <Button type="button" disabled={pending || ledgers.loading || noLedgers} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
