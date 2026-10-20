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
  AUSTRALIAN_STATE_ORDER,
  PROPERTY_TYPE_LABEL,
  PROPERTY_TYPE_ORDER,
  type AustralianStateKey,
  type PropertyType,
} from '@/constants/api-enums';
import { PROPERTY_EDIT_COPY as COPY, PROPERTY_EDIT_LIMITS } from '@/constants/property-profile-edit';
import { patchAgentProperty } from '@/lib/crossub-api/agent-client';
import { parseWholeNumberInput } from '@/lib/property-overview';
import type { Property } from '@/lib/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

const SELECT_CLASS = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

/** A type the picker does not offer (e.g. GRANNY_FLAT) is kept as it is, shown readably. */
const formatOtherType = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

const countText = (value: number | undefined) => (value == null ? '' : String(value));

/**
 * Edit a property's core facts after intake — the address and the basics staff Properties lets
 * an officer correct. Only changed fields are sent.
 */
export function PropertyFactsEditDialog({
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
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [parking, setParking] = useState('');
  const [furnished, setFurnished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAddress(property.address ?? '');
    setSuburb(property.suburb ?? '');
    setState(property.state ?? '');
    setPostcode(property.postcode ?? '');
    setPropertyType(property.propertyType ?? '');
    setBedrooms(countText(property.bedrooms));
    setBathrooms(countText(property.bathrooms));
    setParking(countText(property.carSpaces));
    setFurnished(property.furnished === true);
  }, [open, property]);

  const submit = async () => {
    if (!address.trim() || !suburb.trim()) {
      toast.error(COPY.addressRequired);
      return;
    }
    const counts = [bedrooms, bathrooms, parking].map((raw) =>
      parseWholeNumberInput(raw, PROPERTY_EDIT_LIMITS.roomsMax),
    );
    if (counts.some((n) => n === null)) {
      toast.error(COPY.invalidCount);
      return;
    }
    const [beds, baths, cars] = counts as Array<number | undefined>;

    setSaving(true);
    try {
      await patchAgentProperty(property.id, {
        ...(address.trim() !== property.address ? { address: address.trim() } : {}),
        ...(suburb.trim() !== property.suburb ? { suburb: suburb.trim() } : {}),
        ...(state && state !== property.state ? { state: state as AustralianStateKey } : {}),
        ...(postcode.trim() && postcode.trim() !== property.postcode
          ? { postcode: postcode.trim() }
          : {}),
        ...(propertyType && propertyType !== property.propertyType
          ? { propertyType: propertyType as PropertyType }
          : {}),
        ...(beds !== undefined && beds !== property.bedrooms ? { bedrooms: beds } : {}),
        ...(baths !== undefined && baths !== property.bathrooms ? { bathrooms: baths } : {}),
        ...(cars !== undefined && cars !== property.carSpaces ? { parking: cars } : {}),
        ...(furnished !== (property.furnished === true) ? { furnished } : {}),
      });
      toast.success(COPY.factsSaved);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save the property"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.factsTitle}</DialogTitle>
          <DialogDescription>{COPY.factsDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="facts-address">{COPY.address}</Label>
            <Input id="facts-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="facts-suburb">{COPY.suburb}</Label>
              <Input id="facts-suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facts-state">{COPY.state}</Label>
              <select
                id="facts-state"
                className={SELECT_CLASS}
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                {state ? null : <option value="">—</option>}
                {AUSTRALIAN_STATE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facts-postcode">{COPY.postcode}</Label>
              <Input
                id="facts-postcode"
                inputMode="numeric"
                maxLength={4}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="facts-type">{COPY.propertyType}</Label>
            <select
              id="facts-type"
              className={SELECT_CLASS}
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
            >
              {propertyType ? null : <option value="">—</option>}
              {propertyType && !PROPERTY_TYPE_ORDER.some((t) => t === propertyType) ? (
                <option value={propertyType}>{formatOtherType(propertyType)}</option>
              ) : null}
              {PROPERTY_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['facts-beds', COPY.bedrooms, bedrooms, setBedrooms],
                ['facts-baths', COPY.bathrooms, bathrooms, setBathrooms],
                ['facts-parking', COPY.parking, parking, setParking],
              ] as const
            ).map(([id, label, value, setValue]) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={furnished}
              onChange={(e) => setFurnished(e.target.checked)}
            />
            {COPY.furnished}
          </label>
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
