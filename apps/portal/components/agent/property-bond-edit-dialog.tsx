'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { propertyRegistryApi } from '@/lib/property-registry-api';

export function PropertyBondEditDialog({
  open,
  onOpenChange,
  propertyId,
  leasingCycleId,
  initialAmount,
  initialReference,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  leasingCycleId?: string;
  initialAmount: number | null;
  initialReference: string;
  onSaved?: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(initialAmount != null && initialAmount > 0 ? String(Math.round(initialAmount)) : '');
    setReference(initialReference);
  }, [open, initialAmount, initialReference]);

  const submit = async () => {
    const parsedAmount = amount.trim() ? Number(amount.replace(/,/g, '')) : null;
    if (parsedAmount != null && (Number.isNaN(parsedAmount) || parsedAmount < 0)) {
      toast.error('Enter a valid bond amount');
      return;
    }

    setSaving(true);
    try {
      if (parsedAmount != null) {
        await propertyRegistryApi.update(propertyId, { bondAmount: parsedAmount });
      }
      if (leasingCycleId && reference.trim()) {
        await leasingOpsApi.setBondLink(leasingCycleId, { link: reference.trim() });
      }
      toast.success('Bond details updated');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update bond');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit bond</DialogTitle>
          <DialogDescription>
            Bond amount and lodgement reference for this property.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="bond-amount">Bond amount</Label>
            <Input
              id="bond-amount"
              inputMode="decimal"
              placeholder="e.g. 3200"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bond-reference">Bond reference / ID</Label>
            <Input
              id="bond-reference"
              placeholder="Lodgement ID or bond portal link"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={!leasingCycleId}
            />
            {!leasingCycleId ? (
              <p className="text-muted-foreground text-[11px]">
                Bond reference can be set once a leasing workflow is active.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
