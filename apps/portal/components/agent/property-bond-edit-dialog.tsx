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
import { propertyRegistryApi } from '@/lib/property-registry-api';

export function PropertyBondEditDialog({
  open,
  onOpenChange,
  propertyId,
  initialAmount,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  initialAmount: number | null;
  onSaved?: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(initialAmount != null && initialAmount > 0 ? String(Math.round(initialAmount)) : '');
  }, [open, initialAmount]);

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
      toast.success('Bond amount updated');
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
            Bond amount for this property. The bond ID is generated automatically when bond is
            marked paid in the new leasing workflow.
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
