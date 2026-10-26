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
import { TRUST_INPUT_LIMITS, TRUST_SUPPLIER_COPY as COPY } from '@/constants/trust';
import { addTrustSupplier, type TrustLedger } from '@/lib/crossub-api/agent-trust-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** Open a supplier ledger on the trust account; its payout details are added from the ledger. */
export function TrustAddSupplierDialog({
  agencyId,
  bankAccountId,
  onClose,
  onAdded,
}: {
  agencyId: string;
  bankAccountId: string;
  onClose: () => void;
  onAdded: (supplier: TrustLedger) => void;
}) {
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(COPY.nameRequired);
      return;
    }
    setPending(true);
    try {
      const supplier = await addTrustSupplier(agencyId, bankAccountId, { name: trimmed });
      toast.success(COPY.added(supplier.name));
      onAdded(supplier);
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
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="trust-supplier-name">{COPY.name}</Label>
          <Input
            id="trust-supplier-name"
            value={name}
            maxLength={TRUST_INPUT_LIMITS.ledgerNameMax}
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onSubmit();
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending || !name.trim()} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
