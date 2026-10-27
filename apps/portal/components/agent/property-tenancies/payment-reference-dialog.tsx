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
import { PAYMENT_REFERENCE_COPY as COPY } from '@/constants/property-tenancies';
import { patchAgentProperty } from '@/lib/crossub-api/agent-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** The rent payment reference the tenant quotes on a bank transfer. Blank removes it. */
export function PaymentReferenceDialog({
  open,
  onOpenChange,
  propertyId,
  current,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  current?: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(current ?? '');
  }, [open, current]);

  const save = async () => {
    setSaving(true);
    try {
      await patchAgentProperty(propertyId, { paymentReference: value.trim() || null });
      toast.success(COPY.DONE);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.FAILED));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{COPY.TITLE}</DialogTitle>
          <DialogDescription>{COPY.DESCRIPTION}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="payment-reference">{COPY.LABEL}</Label>
          <Input id="payment-reference" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {COPY.CANCEL}
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.SAVE}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
