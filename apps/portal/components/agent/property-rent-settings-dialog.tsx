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
import {
  PROPERTY_EDIT_COPY as COPY,
  PROPERTY_EDIT_LIMITS,
  PROPERTY_RENT_PERIOD,
  PROPERTY_RENT_PERIOD_LABEL,
  PROPERTY_RENT_PERIOD_ORDER,
  type PropertyRentPeriod,
} from '@/constants/property-profile-edit';
import { patchAgentProperty } from '@/lib/crossub-api/agent-client';
import type { Property } from '@/lib/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Rent cycle, rent payment reference and the property's repair limit — the three rent settings
 * staff Properties holds that the agent app could not edit. Only changed fields are sent.
 */
export function PropertyRentSettingsDialog({
  open,
  onOpenChange,
  property,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  onSaved?: () => void;
}) {
  const initialPeriod = property.rentPeriod ?? PROPERTY_RENT_PERIOD.WEEKLY;
  const initialReference = property.paymentReference ?? '';
  const initialLimit =
    property.maintenanceSpendThreshold != null ? String(property.maintenanceSpendThreshold) : '';

  const [rentPeriod, setRentPeriod] = useState<PropertyRentPeriod>(initialPeriod);
  const [paymentReference, setPaymentReference] = useState(initialReference);
  const [limit, setLimit] = useState(initialLimit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRentPeriod(initialPeriod);
    setPaymentReference(initialReference);
    setLimit(initialLimit);
  }, [open, initialPeriod, initialReference, initialLimit]);

  const submit = async () => {
    const limitText = limit.replace(/,/g, '').trim();
    const limitValue = limitText ? Number(limitText) : null;
    if (limitValue !== null && (!Number.isFinite(limitValue) || limitValue < 0)) {
      toast.error(COPY.invalidLimit);
      return;
    }
    setSaving(true);
    try {
      await patchAgentProperty(property.id, {
        ...(rentPeriod !== initialPeriod ? { rentPeriod } : {}),
        ...(paymentReference.trim() !== initialReference.trim()
          ? { paymentReference: paymentReference.trim() || null }
          : {}),
        ...(limitText !== initialLimit ? { maintenanceSpendThreshold: limitValue } : {}),
      });
      toast.success(COPY.rentSaved);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save the rent settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.rentTitle}</DialogTitle>
          <DialogDescription>{COPY.rentDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="rent-period">{COPY.rentPeriod}</Label>
            <select
              id="rent-period"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={rentPeriod}
              onChange={(e) => setRentPeriod(e.target.value as PropertyRentPeriod)}
            >
              {PROPERTY_RENT_PERIOD_ORDER.includes(rentPeriod) ? null : (
                <option value={rentPeriod}>{PROPERTY_RENT_PERIOD_LABEL[rentPeriod]}</option>
              )}
              {PROPERTY_RENT_PERIOD_ORDER.map((period) => (
                <option key={period} value={period}>
                  {PROPERTY_RENT_PERIOD_LABEL[period]}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">{COPY.rentPeriodHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rent-reference">{COPY.paymentReference}</Label>
            <Input
              id="rent-reference"
              value={paymentReference}
              maxLength={PROPERTY_EDIT_LIMITS.paymentReferenceMax}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{COPY.paymentReferenceHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rent-limit">{COPY.repairLimit}</Label>
            <Input
              id="rent-limit"
              inputMode="decimal"
              placeholder={COPY.agencyDefault}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{COPY.repairLimitHint}</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
