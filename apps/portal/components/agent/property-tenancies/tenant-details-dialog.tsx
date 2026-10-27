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
  REGISTRY_NAME_SKIP_NOTE,
  TENANT_DETAILS_COPY as COPY,
  TENANT_RECORD_LAYER_LABEL,
} from '@/constants/property-tenancies';
import { updateTenantDetails } from '@/lib/crossub-api/agent-tenancy-client';
import { splitApplicantName } from '@/lib/tenant-provision-prefill';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export type TenantDetailsTarget = {
  personId: string;
  name: string;
  email?: string;
  mobile?: string;
};

/**
 * "View contact" on a tenant: edit their name, email and phone on every record that holds them,
 * including the tenant's own app login. The toast lists the records that changed.
 */
export function TenantDetailsDialog({
  propertyId,
  target,
  onOpenChange,
  onSaved,
}: {
  propertyId: string;
  /** Open while set. */
  target: TenantDetailsTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    const parts = splitApplicantName(target.name);
    setFirstName(parts.firstName);
    setLastName(parts.lastName);
    setEmail(target.email ?? '');
    setPhone(target.mobile ?? '');
  }, [target]);

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const result = await updateTenantDetails(propertyId, target.personId, {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });
      const touched = result.updated.map((layer) => TENANT_RECORD_LAYER_LABEL[layer] ?? layer);
      toast.success(touched.length > 0 ? `${COPY.DONE}: ${touched.join(', ')}` : COPY.NOTHING);
      const note = result.registrySkipped ? REGISTRY_NAME_SKIP_NOTE[result.registrySkipped] : '';
      if (note) toast.warning(note);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.FAILED));
    } finally {
      setSaving(false);
    }
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, type = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <Dialog open={target != null} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.TITLE}</DialogTitle>
          <DialogDescription>{COPY.DESCRIPTION}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-2">
            {field('tenant-first-name', COPY.FIRST_NAME, firstName, setFirstName)}
            {field('tenant-last-name', COPY.LAST_NAME, lastName, setLastName)}
          </div>
          {field('tenant-email', COPY.EMAIL, email, setEmail, 'email')}
          {field('tenant-phone', COPY.PHONE, phone, setPhone, 'tel')}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {COPY.CANCEL}
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.SAVE}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
