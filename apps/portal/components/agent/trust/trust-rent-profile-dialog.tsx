'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustLoadError, TrustLoading } from '@/components/agent/trust/trust-ui';
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
  TRUST_INPUT_LIMITS,
  TRUST_RENT_PERIOD,
  TRUST_RENT_PERIOD_NAME,
  TRUST_RENT_PERIODS,
  TRUST_RENT_PROFILE_COPY as COPY,
  type TrustRentPeriod,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustLedger,
  setTrustRentProfile,
  type TrustLedger,
  type TrustRentRow,
} from '@/lib/crossub-api/agent-trust-client';
import { centsToDollarsInput, parseDollarsToCents } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

type RentProfile = NonNullable<TrustLedger['rentProfile']>;

/**
 * Set up or correct a tenant ledger's rent. The API replaces the whole profile, so the form
 * starts from the saved one (part payment, rent change, move-in) and sends every field back.
 * Mount it per open, keyed by the row.
 */
export function TrustRentProfileDialog({
  agencyId,
  row,
  onClose,
  onSaved,
}: {
  agencyId: string;
  row: TrustRentRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ledger = useTrustResource(`${agencyId}:${row.ledgerId}`, () =>
    fetchTrustLedger(agencyId, row.ledgerId),
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.title(row.ledgerName)}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        {ledger.data ? (
          <RentProfileForm
            agencyId={agencyId}
            ledgerId={row.ledgerId}
            saved={ledger.data.rentProfile ?? null}
            onClose={onClose}
            onSaved={onSaved}
          />
        ) : ledger.error ? (
          <TrustLoadError error={ledger.error} onRetry={ledger.reload} />
        ) : (
          <TrustLoading />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RentProfileForm({
  agencyId,
  ledgerId,
  saved,
  onClose,
  onSaved,
}: {
  agencyId: string;
  ledgerId: string;
  saved: RentProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(centsToDollarsInput(saved?.rentAmountCents));
  const [period, setPeriod] = useState<TrustRentPeriod>(saved?.rentPeriod ?? TRUST_RENT_PERIOD.WEEKLY);
  const [paidTo, setPaidTo] = useState(saved?.paidToDate ?? '');
  const [partPayment, setPartPayment] = useState(centsToDollarsInput(saved?.partPaymentCents ?? 0));
  const [newAmount, setNewAmount] = useState(centsToDollarsInput(saved?.newRentAmountCents));
  const [newFrom, setNewFrom] = useState(saved?.newRentFrom ?? '');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const rentAmountCents = parseDollarsToCents(amount);
    if (rentAmountCents == null || rentAmountCents <= 0) {
      toast.error(COPY.amountInvalid);
      return;
    }
    if (!paidTo) {
      toast.error(COPY.paidToRequired);
      return;
    }
    const partPaymentCents = partPayment.trim() ? parseDollarsToCents(partPayment) : 0;
    if (partPaymentCents == null) {
      toast.error(COPY.partPaymentInvalid);
      return;
    }
    const newRentAmountCents = newAmount.trim() ? parseDollarsToCents(newAmount) : null;
    if (newAmount.trim() && (newRentAmountCents == null || newRentAmountCents <= 0)) {
      toast.error(COPY.amountInvalid);
      return;
    }
    if ((newRentAmountCents == null) !== !newFrom) {
      toast.error(COPY.newRentIncomplete);
      return;
    }
    if (newFrom && newFrom <= paidTo) {
      toast.error(COPY.newRentAfterPaidTo);
      return;
    }
    setPending(true);
    try {
      await setTrustRentProfile(agencyId, ledgerId, {
        rentAmountCents,
        rentPeriod: period,
        paidToDate: paidTo,
        partPaymentCents,
        newRentAmountCents,
        newRentFrom: newFrom || null,
        // Not edited here; sent back so the save keeps it.
        moveInDate: saved?.moveInDate ?? undefined,
        note: note.trim() || undefined,
      });
      toast.success(COPY.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-rent-amount">{COPY.amount}</Label>
            <Input
              id="trust-rent-amount"
              inputMode="decimal"
              value={amount}
              disabled={pending}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-rent-period">{COPY.period}</Label>
            <select
              id="trust-rent-period"
              className={SELECT_CLASS}
              value={period}
              disabled={pending}
              onChange={(e) => setPeriod(e.target.value as TrustRentPeriod)}
            >
              {TRUST_RENT_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {TRUST_RENT_PERIOD_NAME[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-rent-paid-to">{COPY.paidTo}</Label>
            <Input
              id="trust-rent-paid-to"
              type="date"
              value={paidTo}
              disabled={pending}
              onChange={(e) => setPaidTo(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{COPY.paidToHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-rent-part">{COPY.partPayment}</Label>
            <Input
              id="trust-rent-part"
              inputMode="decimal"
              value={partPayment}
              disabled={pending}
              onChange={(e) => setPartPayment(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-muted-foreground text-xs">{COPY.partPaymentHint}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-rent-new-amount">{COPY.newRentAmount}</Label>
            <Input
              id="trust-rent-new-amount"
              inputMode="decimal"
              value={newAmount}
              disabled={pending}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-rent-new-from">{COPY.newRentFrom}</Label>
            <Input
              id="trust-rent-new-from"
              type="date"
              value={newFrom}
              min={paidTo || undefined}
              disabled={pending}
              onChange={(e) => setNewFrom(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trust-rent-note">{COPY.note}</Label>
          <Input
            id="trust-rent-note"
            value={note}
            maxLength={TRUST_INPUT_LIMITS.rentNoteMax}
            disabled={pending}
            onChange={(e) => setNote(e.target.value)}
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
    </>
  );
}
