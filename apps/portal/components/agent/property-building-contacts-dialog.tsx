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

type ContactsForm = {
  buildingManagerName: string;
  buildingManagerEmail: string;
  buildingManagerPhone: string;
  strataContactName: string;
  strataContactEmail: string;
  strataContactPhone: string;
};

const EMPTY: ContactsForm = {
  buildingManagerName: '',
  buildingManagerEmail: '',
  buildingManagerPhone: '',
  strataContactName: '',
  strataContactEmail: '',
  strataContactPhone: '',
};

export function PropertyBuildingContactsDialog({
  open,
  onOpenChange,
  propertyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<ContactsForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void propertyRegistryApi
      .get(propertyId)
      .then((property) => {
        setForm({
          buildingManagerName: property.buildingManagerName ?? '',
          buildingManagerEmail: property.buildingManagerEmail ?? '',
          buildingManagerPhone: property.buildingManagerPhone ?? '',
          strataContactName: property.strataContactName ?? '',
          strataContactEmail: property.strataContactEmail ?? '',
          strataContactPhone: property.strataContactPhone ?? '',
        });
      })
      .catch(() => {
        toast.error('Could not load building contacts');
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, propertyId, onOpenChange]);

  const set = <K extends keyof ContactsForm>(key: K, value: ContactsForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      await propertyRegistryApi.update(propertyId, {
        buildingManagerName: form.buildingManagerName.trim() || undefined,
        buildingManagerEmail: form.buildingManagerEmail.trim() || undefined,
        buildingManagerPhone: form.buildingManagerPhone.trim() || undefined,
        strataContactName: form.strataContactName.trim() || undefined,
        strataContactEmail: form.strataContactEmail.trim() || undefined,
        strataContactPhone: form.strataContactPhone.trim() || undefined,
      });
      toast.success('Building contacts updated');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update contacts');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Building contacts</DialogTitle>
          <DialogDescription>
            Optional building manager and strata details for the Overview tab.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <p className="text-xs font-semibold">Building manager</p>
              <div className="grid gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.buildingManagerName}
                    onChange={(e) => set('buildingManagerName', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={form.buildingManagerEmail}
                    onChange={(e) => set('buildingManagerEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={form.buildingManagerPhone}
                    onChange={(e) => set('buildingManagerPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-semibold">Strata</p>
              <div className="grid gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.strataContactName}
                    onChange={(e) => set('strataContactName', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={form.strataContactEmail}
                    onChange={(e) => set('strataContactEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={form.strataContactPhone}
                    onChange={(e) => set('strataContactPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={loading || saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
