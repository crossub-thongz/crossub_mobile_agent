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
import { PROPERTY_CONTACT_ROLE } from '@/constants/property-contact';
import {
  CONTACT_EDITOR_COPY,
  EDIT_OWNERS_COPY as COPY,
  MANAGEMENT_RATE_GST,
  OVERVIEW_COPY,
} from '@/constants/property-tenancies';
import { patchAgentProperty, type AgentPropertyPatch } from '@/lib/crossub-api/agent-client';
import type { PropertyTenancyOverview } from '@/lib/crossub-api/agent-tenancy-client';
import type { Property } from '@/lib/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { dayKey } from '@/utils/current-tenancy';
import { parseAmountInput } from '@/utils/property-tenancy-overview';

import { ContactListEditor } from './contact-list-editor';

const SELECT_CLASS = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';
const MAX_RATE_PERCENT = 100;

/** An owner as the Owner card lists them. */
export type OwnerParty = { name: string; email?: string; mobile?: string };

type GstChoice = '' | (typeof MANAGEMENT_RATE_GST)[keyof typeof MANAGEMENT_RATE_GST];

type OwnerForm = {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  insuranceExpiry: string;
  rate: string;
  gst: GstChoice;
};

const EMPTY_FORM: OwnerForm = {
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  insuranceExpiry: '',
  rate: '',
  gst: '',
};

/**
 * Owner details (the pencil on the Overview Owner card): the owner contacts, the owner held only
 * on the property record when there are no contact rows, and the insurance and management rate.
 */
export function EditOwnersDialog({
  open,
  onOpenChange,
  property,
  record,
  registryOwner,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  record: PropertyTenancyOverview;
  /** The owner on the property record, shown when there are no owner contacts. */
  registryOwner: OwnerParty | null;
  onSaved: () => void;
}) {
  const owners = record.contacts.filter((c) => c.role === PROPERTY_CONTACT_ROLE.LANDLORD);
  const [initial, setInitial] = useState<OwnerForm>(EMPTY_FORM);
  const [form, setForm] = useState<OwnerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const showRegistry = owners.length === 0 && registryOwner != null;
  const set = <K extends keyof OwnerForm>(key: K, value: OwnerForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!open) return;
    const percent = record.overview.managementRatePercent ?? property.managementRatePercent;
    const seeded: OwnerForm = {
      ownerName: registryOwner?.name ?? '',
      ownerEmail: registryOwner?.email ?? '',
      ownerPhone: registryOwner?.mobile ?? '',
      insuranceExpiry: dayKey(record.overview.landlordInsuranceExpiry) ?? '',
      rate: percent != null ? String(percent) : '',
      gst: record.overview.managementRateGst ?? property.managementRateGst ?? '',
    };
    setInitial(seeded);
    setForm(seeded);
    // Seed once per open; contact edits reload `record` and must not reset the typed form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    let percent: number | undefined;
    try {
      percent = parseAmountInput(form.rate);
    } catch {
      return void toast.error(COPY.INVALID_RATE);
    }
    if (percent != null && percent > MAX_RATE_PERCENT) return void toast.error(COPY.INVALID_RATE);
    if (showRegistry && !form.ownerName.trim()) return void toast.error(COPY.REGISTRY_NAME_REQUIRED);
    const changed = (key: keyof OwnerForm) => form[key].trim() !== initial[key].trim();
    const patch: AgentPropertyPatch = {
      ...(changed('insuranceExpiry') && form.insuranceExpiry
        ? { landlordInsuranceExpiry: form.insuranceExpiry }
        : {}),
      ...(changed('rate') && percent != null ? { managementRatePercent: percent } : {}),
      ...(changed('gst') && form.gst ? { managementRateGst: form.gst } : {}),
      ...(showRegistry && changed('ownerName') ? { landlordName: form.ownerName.trim() } : {}),
      ...(showRegistry && changed('ownerEmail') && form.ownerEmail.trim()
        ? { landlordEmail: form.ownerEmail.trim() }
        : {}),
      ...(showRegistry && changed('ownerPhone') && form.ownerPhone.trim()
        ? { landlordPhone: form.ownerPhone.trim() }
        : {}),
    };
    setSaving(true);
    try {
      if (Object.keys(patch).length > 0) await patchAgentProperty(property.id, patch);
      toast.success(COPY.SAVED);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.TITLE}</DialogTitle>
          <DialogDescription>{COPY.DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <p className="text-sm font-semibold">{COPY.OWNERS}</p>
            {showRegistry ? (
              <div className="space-y-2 rounded-lg border p-3">
                <Input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder={CONTACT_EDITOR_COPY.NAME} aria-label={CONTACT_EDITOR_COPY.NAME} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input type="email" value={form.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} placeholder={CONTACT_EDITOR_COPY.EMAIL} aria-label={CONTACT_EDITOR_COPY.EMAIL} />
                  <Input type="tel" value={form.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} placeholder={CONTACT_EDITOR_COPY.PHONE} aria-label={CONTACT_EDITOR_COPY.PHONE} />
                </div>
              </div>
            ) : null}
            <ContactListEditor
              propertyId={property.id}
              role={PROPERTY_CONTACT_ROLE.LANDLORD}
              contacts={owners}
              emptyLabel={showRegistry ? '' : COPY.NO_OWNERS}
              addLabel={COPY.ADD_OWNER}
              onChanged={onSaved}
            />
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold">{COPY.AGREEMENT}</p>
            <div className="space-y-1.5">
              <Label htmlFor="owner-insurance-expiry">{COPY.INSURANCE_EXPIRY}</Label>
              <Input id="owner-insurance-expiry" type="date" value={form.insuranceExpiry} onChange={(e) => set('insuranceExpiry', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="owner-management-rate">{COPY.MANAGEMENT_RATE}</Label>
                <Input id="owner-management-rate" inputMode="decimal" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-management-gst">{COPY.MANAGEMENT_RATE_GST}</Label>
                <select
                  id="owner-management-gst"
                  className={SELECT_CLASS}
                  value={form.gst}
                  onChange={(e) => set('gst', e.target.value as GstChoice)}
                >
                  <option value="">{COPY.GST_UNSET}</option>
                  <option value={MANAGEMENT_RATE_GST.INCLUDE}>{OVERVIEW_COPY.GST_INCLUDE}</option>
                  <option value={MANAGEMENT_RATE_GST.EXCLUDE}>{OVERVIEW_COPY.GST_EXCLUDE}</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {COPY.CLOSE}
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
