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
import { PEOPLE_ADD_SUPPLIER_COPY as COPY } from '@/constants/people';
import { addPreferredContractor } from '@/lib/crossub-api/agent-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Add one of the agency's own tradies or suppliers. It is saved as a preferred contractor, so it
 * shows under People as a Supplier and can be invited to quote on a maintenance job.
 */
export function PeopleAddSupplierDialog({
  agencyId,
  onClose,
  onAdded,
}: {
  agencyId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);
  const canSubmit = name.trim() !== '' && email.trim() !== '';

  async function onSubmit() {
    if (!canSubmit) {
      toast.error(COPY.required);
      return;
    }
    setPending(true);
    try {
      const supplier = await addPreferredContractor(agencyId, {
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      toast.success(COPY.added(supplier.name));
      onAdded();
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
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="people-supplier-name">{COPY.name}</Label>
            <Input
              id="people-supplier-name"
              value={name}
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="people-supplier-email">{COPY.email}</Label>
            <Input
              id="people-supplier-email"
              type="email"
              value={email}
              disabled={pending}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="people-supplier-phone">{COPY.phone}</Label>
            <Input
              id="people-supplier-phone"
              type="tel"
              value={phone}
              disabled={pending}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending || !canSubmit} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
