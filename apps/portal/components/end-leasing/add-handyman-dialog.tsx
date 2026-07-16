'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  addPreferredContractor,
  type PreferredContractor,
} from '@/lib/crossub-api/agent-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function AddHandymanDialog({
  open,
  onOpenChange,
  agencyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string | null | undefined;
  onCreated: (contractor: PreferredContractor) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tag1, setTag1] = useState('');
  const [tag2, setTag2] = useState('');
  const [tag3, setTag3] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setPhone('');
    setTag1('');
    setTag2('');
    setTag3('');
  }, [open]);

  const submit = async () => {
    if (!agencyId) {
      toast.error('Property agency is required to add a handyman');
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Enter the handyman name');
      return;
    }

    const serviceTypes = [tag1, tag2, tag3].map((t) => t.trim()).filter(Boolean);

    setSaving(true);
    try {
      const contractor = await addPreferredContractor(agencyId, {
        name: trimmedName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        serviceTypes: serviceTypes.length > 0 ? serviceTypes : undefined,
      });
      toast.success('Handyman added');
      onCreated(contractor);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent elevated className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add handyman</DialogTitle>
          <DialogDescription>
            Save a contractor to your agency preferred tradies list (visible in Admin Portal →
            Agency Portal → Preferred Tradies). They will appear in tradesman suggestions for
            future maintenance jobs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-2">
            <Label htmlFor="handyman-name">Name</Label>
            <Input
              id="handyman-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contractor / company name"
              autoFocus
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="handyman-email">Email</Label>
              <Input
                id="handyman-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handyman-phone">Phone</Label>
              <Input
                id="handyman-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="04xx xxx xxx"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Specialisations (optional)</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={tag1}
                onChange={(e) => setTag1(e.target.value)}
                placeholder="e.g. Plumbing"
                className="text-xs"
              />
              <Input
                value={tag2}
                onChange={(e) => setTag2(e.target.value)}
                placeholder="e.g. Painting"
                className="text-xs"
              />
              <Input
                value={tag3}
                onChange={(e) => setTag3(e.target.value)}
                placeholder="e.g. General"
                className="text-xs"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || !name.trim()} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Add handyman'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
