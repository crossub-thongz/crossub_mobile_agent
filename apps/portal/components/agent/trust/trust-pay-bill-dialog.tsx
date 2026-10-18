'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
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
import { TRUST_PAY_BILL_COPY as COPY } from '@/constants/trust';
import { payTrustBill, type TrustBill } from '@/lib/crossub-api/agent-trust-client';
import { formatCents, newTrustIdempotencyKey, trustTodayKey } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function TrustPayBillDialog({
  agencyId,
  bill,
  onClose,
  onPaid,
}: {
  agencyId: string;
  bill: TrustBill;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [date, setDate] = useState(trustTodayKey);
  const [idempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setPending(true);
    try {
      await payTrustBill(agencyId, bill.id, { idempotencyKey, effectiveDate: date });
      toast.success(COPY.paid(bill.billNumber));
      onPaid();
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{COPY.title(bill.billNumber)}</DialogTitle>
          <DialogDescription>
            {COPY.description(formatCents(bill.amountCents), bill.supplierLedger.name)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="trust-pay-bill-date">{COPY.date}</Label>
          <Input
            id="trust-pay-bill-date"
            type="date"
            value={date}
            max={trustTodayKey()}
            disabled={pending}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending || !date} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
