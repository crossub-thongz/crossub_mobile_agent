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

type TenancyForm = {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  rentWeekly: string;
  leaseStartDate: string;
  leaseEndDate: string;
  nextRentReviewAt: string;
  vacateDate: string;
  nextInspectionAt: string;
};

export function PropertyTenancyEditDialog({
  open,
  onOpenChange,
  propertyId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  initial: TenancyForm;
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<TenancyForm>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial);
  }, [open, initial]);

  const set = <K extends keyof TenancyForm>(key: K, value: TenancyForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const rent = form.rentWeekly.trim() ? Number(form.rentWeekly.replace(/,/g, '')) : undefined;
    if (rent != null && (Number.isNaN(rent) || rent < 0)) {
      toast.error('Enter a valid rent amount');
      return;
    }

    setSaving(true);
    try {
      await propertyRegistryApi.update(propertyId, {
        tenantName: form.tenantName.trim() || undefined,
        tenantEmail: form.tenantEmail.trim() || undefined,
        tenantPhone: form.tenantPhone.trim() || undefined,
        rentWeekly: rent,
        leaseStartDate: form.leaseStartDate || undefined,
        leaseEndDate: form.leaseEndDate || undefined,
        nextRentReviewAt: form.nextRentReviewAt || undefined,
        vacateDate: form.vacateDate || undefined,
        nextInspectionAt: form.nextInspectionAt || undefined,
      });
      toast.success('Tenancy details updated');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update tenancy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit tenancy</DialogTitle>
          <DialogDescription>Tenant contact, rent, and key tenancy dates.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <p className="text-xs font-semibold">Tenant</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tenant-name">Name</Label>
                <Input
                  id="tenant-name"
                  value={form.tenantName}
                  onChange={(e) => set('tenantName', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-email">Email</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  value={form.tenantEmail}
                  onChange={(e) => set('tenantEmail', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-phone">Mobile</Label>
                <Input
                  id="tenant-phone"
                  value={form.tenantPhone}
                  onChange={(e) => set('tenantPhone', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rent-weekly">Rent ($/week)</Label>
            <Input
              id="rent-weekly"
              inputMode="decimal"
              value={form.rentWeekly}
              onChange={(e) => set('rentWeekly', e.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lease-start">Lease start</Label>
              <Input
                id="lease-start"
                type="date"
                value={form.leaseStartDate}
                onChange={(e) => set('leaseStartDate', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lease-end">Lease end</Label>
              <Input
                id="lease-end"
                type="date"
                value={form.leaseEndDate}
                onChange={(e) => set('leaseEndDate', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next-rent-review">Next rent review</Label>
              <Input
                id="next-rent-review"
                type="date"
                value={form.nextRentReviewAt}
                onChange={(e) => set('nextRentReviewAt', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vacate-date">Vacate date</Label>
              <Input
                id="vacate-date"
                type="date"
                value={form.vacateDate}
                onChange={(e) => set('vacateDate', e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="next-routine">Next routine inspection</Label>
              <Input
                id="next-routine"
                type="date"
                value={form.nextInspectionAt}
                onChange={(e) => set('nextInspectionAt', e.target.value)}
              />
            </div>
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
