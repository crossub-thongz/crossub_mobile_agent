'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
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
  bondId,
  bondLodgementUrl,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  initialAmount: number | null;
  bondId?: string | null;
  bondLodgementUrl?: string | null;
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

  const lodgementUrl = bondLodgementUrl?.trim() || null;
  const showLodgement = Boolean(lodgementUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bond</DialogTitle>
          <DialogDescription>
            Bond amount and lodgement reference for this property. The bond ID is assigned when
            CROSSUB sends the bond link in new leasing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {bondId ? (
            <div className="space-y-1.5">
              <Label>Bond ID</Label>
              <p className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm">{bondId}</p>
            </div>
          ) : null}

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

          {showLodgement ? (
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Bond lodgement</p>
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" asChild>
                  <a href={lodgementUrl!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    Open portal
                  </a>
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Preview the state bond lodgement portal link sent to the tenant.
              </p>
              <div className="overflow-hidden rounded-lg border bg-background">
                <iframe
                  title="Bond lodgement preview"
                  src={lodgementUrl!}
                  className="h-56 w-full bg-white"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save amount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
