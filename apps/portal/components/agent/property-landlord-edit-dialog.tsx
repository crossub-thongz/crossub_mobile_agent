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

export function PropertyLandlordEditDialog({
  open,
  onOpenChange,
  propertyId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  initial: { name: string; email: string; phone: string };
  onSaved?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial.name);
    setEmail(initial.email);
    setPhone(initial.phone);
  }, [open, initial.name, initial.email, initial.phone]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Landlord name is required');
      return;
    }
    setSaving(true);
    try {
      await propertyRegistryApi.update(propertyId, {
        landlordName: name.trim(),
        landlordEmail: email.trim() || undefined,
        landlordPhone: phone.trim() || undefined,
      });
      toast.success('Landlord details updated');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update landlord');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit landlord</DialogTitle>
          <DialogDescription>Owner contact details for this property.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="landlord-name">Name</Label>
            <Input id="landlord-name" inputKind="person_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landlord-email">Email</Label>
            <Input
              id="landlord-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landlord-phone">Mobile</Label>
            <Input id="landlord-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
