'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
import { TRUST_PREVIEW_DEBOUNCE_MS, TRUST_TRANSFER_DEPOSIT_COPY as COPY } from '@/constants/trust-invoices';
import type { TrustLedger } from '@/lib/crossub-api/agent-trust-client';
import {
  fetchTrustRentPreview,
  transferTrustDeposit,
  type TrustRentPreview,
} from '@/lib/crossub-api/agent-trust-invoices-client';
import {
  centsToDollarsInput,
  formatCents,
  formatTrustDate,
  newTrustIdempotencyKey,
  parseDollarsToCents,
  trustTodayKey,
} from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { trustIdempotencyKeyAfterError } from '@/utils/trust-transactions';

/** Move a tenant's held deposit to rent: a journal to the owner that moves paid-to on. Mount per open. */
export function TrustTransferDepositDialog({
  agencyId,
  ledger,
  depositHeldCents,
  onClose,
  onTransferred,
}: {
  agencyId: string;
  ledger: TrustLedger;
  depositHeldCents: number;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const [amount, setAmount] = useState(centsToDollarsInput(depositHeldCents));
  const [date, setDate] = useState(trustTodayKey);
  const [idempotencyKey, setIdempotencyKey] = useState(newTrustIdempotencyKey);
  const [preview, setPreview] = useState<{ key: string; data: TrustRentPreview | null } | null>(null);
  const [pending, setPending] = useState(false);

  const amountCents = parseDollarsToCents(amount);
  const previewKey =
    ledger.rentProfile && amountCents != null && amountCents > 0 && date ? `${amountCents}|${date}` : null;

  useEffect(() => {
    if (!previewKey || amountCents == null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchTrustRentPreview(agencyId, ledger.id, { amountCents, receiptDate: date })
        .then((data) => {
          if (!cancelled) setPreview({ key: previewKey, data });
        })
        .catch(() => {
          if (!cancelled) setPreview({ key: previewKey, data: null });
        });
    }, TRUST_PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [agencyId, ledger.id, previewKey, amountCents, date]);

  const shown = previewKey && preview?.key === previewKey ? preview.data : null;

  async function onSubmit() {
    if (amountCents == null || amountCents <= 0) {
      toast.error(COPY.amountInvalid);
      return;
    }
    if (amountCents > depositHeldCents) {
      toast.error(COPY.overHeld(formatCents(depositHeldCents)));
      return;
    }
    if (!date) {
      toast.error(COPY.dateRequired);
      return;
    }
    setPending(true);
    try {
      await transferTrustDeposit(agencyId, ledger.id, { idempotencyKey, amountCents, effectiveDate: date });
      toast.success(COPY.done);
      onTransferred();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setIdempotencyKey((current) => trustIdempotencyKeyAfterError(err, current));
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
          <DialogDescription>{COPY.description(formatCents(depositHeldCents))}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-transfer-amount">{COPY.amount}</Label>
              <Input
                id="trust-transfer-amount"
                inputMode="decimal"
                value={amount}
                placeholder="0.00"
                disabled={pending}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-transfer-date">{COPY.date}</Label>
              <Input
                id="trust-transfer-date"
                type="date"
                value={date}
                max={trustTodayKey()}
                disabled={pending}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          {shown ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              <p className="font-medium">
                {COPY.previewPaidTo(formatTrustDate(shown.paidToAfter), formatTrustDate(shown.effectivePaidToAfter))}
              </p>
              <p className="text-muted-foreground mt-1">{shown.detailsText}</p>
            </div>
          ) : null}
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
