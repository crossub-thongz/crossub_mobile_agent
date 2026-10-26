'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
  TRUST_JOURNAL_COPY as COPY,
  TRUST_JOURNAL_KINDS,
  TRUST_NEW_TRANSACTION_COPY as FORM,
  TRUST_TRANSACTION_LIMITS as LIMITS,
} from '@/constants/trust-transactions';
import type { TrustLedger } from '@/lib/crossub-api/agent-trust-client';
import { postTrustJournal } from '@/lib/crossub-api/agent-trust-transactions-client';
import { formatCents, newTrustIdempotencyKey, trustTodayKey } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import {
  trustAmountWithGst,
  trustIdempotencyKeyAfterError,
  trustOptionalText,
  trustPostingDate,
  trustRequiredText,
} from '@/utils/trust-transactions';

/** Move money from one ledger to another without touching the bank balance (staff "Journal"). Mount per open. */
export function TrustJournalDialog({
  agencyId,
  bankAccountId,
  onClose,
  onPosted,
}: {
  agencyId: string;
  bankAccountId: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const ledgers = useTrustOpenLedgers(agencyId, bankAccountId, TRUST_JOURNAL_KINDS);

  const [from, setFrom] = useState<TrustLedger | null>(null);
  const [to, setTo] = useState<TrustLedger | null>(null);
  const [amount, setAmount] = useState('');
  const [gst, setGst] = useState('');
  const [date, setDate] = useState(trustTodayKey);
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    if (!from || !to) return void toast.error(COPY.bothRequired);
    if (from.id === to.id) return void toast.error(COPY.sameLedger);
    const money = trustAmountWithGst(amount, gst);
    if (!money.ok) return void toast.error(money.error);
    const day = trustPostingDate(date);
    if (!day.ok) return void toast.error(day.error);
    const what = trustRequiredText(description, FORM.field.description, LIMITS.descriptionMax, FORM.descriptionRequired);
    if (!what.ok) return void toast.error(what.error);
    const line = trustOptionalText(details, FORM.field.details, LIMITS.detailsMax);
    if (!line.ok) return void toast.error(line.error);

    setPending(true);
    try {
      const tx = await postTrustJournal(agencyId, bankAccountId, {
        idempotencyKey,
        effectiveDate: day.value,
        description: what.value,
        fromLedgerId: from.id,
        toLedgerId: to.id,
        amountCents: money.value.amountCents,
        gstCents: money.value.gstCents,
        details: line.value,
      });
      toast.success(COPY.done(tx.auditNumber));
      onPosted();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setIdempotencyKey((current) => trustIdempotencyKeyAfterError(err, current));
    } finally {
      setPending(false);
    }
  }

  const list = ledgers.data ?? [];
  const tooFew = ledgers.data != null && ledgers.data.length < 2;
  const pickDisabled = pending || ledgers.loading || tooFew;

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
            <Label htmlFor="trust-journal-from">{COPY.from}</Label>
            <TrustLedgerSelect
              id="trust-journal-from"
              ledgers={list}
              value={from}
              placeholder={COPY.chooseFrom}
              exclude={to?.id}
              disabled={pickDisabled}
              onChange={setFrom}
            />
            {from ? (
              <p className="text-muted-foreground text-xs tabular-nums">{FORM.balance(formatCents(from.balanceCents))}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-journal-to">{COPY.to}</Label>
            <TrustLedgerSelect
              id="trust-journal-to"
              ledgers={list}
              value={to}
              placeholder={COPY.chooseTo}
              exclude={from?.id}
              disabled={pickDisabled}
              onChange={setTo}
            />
            {tooFew ? <p className="text-muted-foreground text-xs">{COPY.tooFew}</p> : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-journal-amount">{FORM.amount}</Label>
              <Input
                id="trust-journal-amount"
                inputMode="decimal"
                value={amount}
                disabled={pending}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-journal-gst">{FORM.gst}</Label>
              <Input
                id="trust-journal-gst"
                inputMode="decimal"
                value={gst}
                disabled={pending}
                onChange={(e) => setGst(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-journal-date">{FORM.date}</Label>
              <Input
                id="trust-journal-date"
                type="date"
                value={date}
                max={trustTodayKey()}
                disabled={pending}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-journal-description">{FORM.description}</Label>
            <Input
              id="trust-journal-description"
              value={description}
              maxLength={LIMITS.descriptionMax}
              disabled={pending}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={COPY.descriptionPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-journal-details">{FORM.details}</Label>
            <Input
              id="trust-journal-details"
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
          <Button type="button" disabled={pickDisabled} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
