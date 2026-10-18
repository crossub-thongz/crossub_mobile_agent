'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
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
  TRUST_RECEIPT_ALLOCATION_KIND,
  TRUST_RECEIPT_COPY as COPY,
  TRUST_RECEIPT_KINDS,
  type TrustPaymentMethod,
  type TrustReceiptAllocationKind,
} from '@/constants/trust';
import {
  postTrustTenantReceipt,
  type TrustRentRow,
} from '@/lib/crossub-api/agent-trust-client';
import { newTrustIdempotencyKey, parseDollarsToCents, trustTodayKey } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** Receipt rent (or a deposit) from one tenant ledger. Mount it per open, keyed by the row. */
export function TrustReceiptDialog({
  agencyId,
  bankAccountId,
  row,
  onClose,
  onReceipted,
}: {
  agencyId: string;
  bankAccountId: string;
  row: TrustRentRow;
  onClose: () => void;
  onReceipted: () => void;
}) {
  const [kind, setKind] = useState<TrustReceiptAllocationKind>(TRUST_RECEIPT_ALLOCATION_KIND.RENT);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(trustTodayKey);
  const [method, setMethod] = useState<TrustPaymentMethod>(TRUST_PAYMENT_METHOD.EFT);
  const [reference, setReference] = useState('');
  const [idempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const amountCents = parseDollarsToCents(amount);
    if (amountCents == null || amountCents <= 0) {
      toast.error(COPY.amountInvalid);
      return;
    }
    if (!date) {
      toast.error(COPY.dateRequired);
      return;
    }
    setPending(true);
    try {
      const tx = await postTrustTenantReceipt(agencyId, bankAccountId, {
        idempotencyKey,
        ledgerId: row.ledgerId,
        effectiveDate: date,
        method,
        allocations: [{ kind, amountCents }],
        reference: reference.trim() || undefined,
      });
      toast.success(COPY.done(tx.receiptNumber));
      onReceipted();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.title}</DialogTitle>
          <DialogDescription>{COPY.description(row.ledgerName)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-receipt-kind">{COPY.kind}</Label>
            <select
              id="trust-receipt-kind"
              className={SELECT_CLASS}
              value={kind}
              disabled={pending}
              onChange={(e) => setKind(e.target.value as TrustReceiptAllocationKind)}
            >
              {TRUST_RECEIPT_KINDS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-receipt-amount">{COPY.amount}</Label>
              <Input
                id="trust-receipt-amount"
                inputMode="decimal"
                value={amount}
                disabled={pending}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-receipt-date">{COPY.date}</Label>
              <Input
                id="trust-receipt-date"
                type="date"
                value={date}
                max={trustTodayKey()}
                disabled={pending}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-receipt-method">{COPY.method}</Label>
            <select
              id="trust-receipt-method"
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
          <div className="space-y-1.5">
            <Label htmlFor="trust-receipt-reference">{COPY.reference}</Label>
            <Input
              id="trust-receipt-reference"
              value={reference}
              disabled={pending}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
