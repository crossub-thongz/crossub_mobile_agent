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
  dateOnly,
  PropertyVacateDateField,
  vacateDateChangeInvalid,
} from '@/components/agent/property-vacate-date-field';
import { propertyRegistryApi, type PropertyRegistryPatch } from '@/lib/property-registry-api';

type TenancyForm = {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  leaseStartDate: string;
  leaseEndDate: string;
  nextRentReviewAt: string;
  rentPaidUntil: string;
  vacateDate: string;
  vacateDateChangeReason: string;
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

  const buildPatch = (): PropertyRegistryPatch => {
    const patch: PropertyRegistryPatch = {};
    const setIfChanged = <K extends keyof PropertyRegistryPatch>(
      key: K,
      next: PropertyRegistryPatch[K] | undefined,
      prev: PropertyRegistryPatch[K] | undefined,
    ) => {
      const normalizedNext = next ?? undefined;
      const normalizedPrev = prev ?? undefined;
      if (normalizedNext !== normalizedPrev) {
        patch[key] = next as PropertyRegistryPatch[K];
      }
    };

    setIfChanged(
      'tenantName',
      form.tenantName.trim() || undefined,
      initial.tenantName.trim() || undefined,
    );
    setIfChanged(
      'tenantEmail',
      form.tenantEmail.trim() || undefined,
      initial.tenantEmail.trim() || undefined,
    );
    setIfChanged(
      'tenantPhone',
      form.tenantPhone.trim() || undefined,
      initial.tenantPhone.trim() || undefined,
    );

    setIfChanged('leaseStartDate', dateOnly(form.leaseStartDate), dateOnly(initial.leaseStartDate));
    setIfChanged('leaseEndDate', dateOnly(form.leaseEndDate), dateOnly(initial.leaseEndDate));
    setIfChanged(
      'nextRentReviewAt',
      dateOnly(form.nextRentReviewAt),
      dateOnly(initial.nextRentReviewAt),
    );
    setIfChanged('rentPaidUntil', dateOnly(form.rentPaidUntil), dateOnly(initial.rentPaidUntil));
    setIfChanged('vacateDate', dateOnly(form.vacateDate), dateOnly(initial.vacateDate));
    if (patch.vacateDate !== undefined) {
      patch.vacateDateChangeReason = form.vacateDateChangeReason.trim();
    }
    setIfChanged(
      'nextInspectionAt',
      dateOnly(form.nextInspectionAt),
      dateOnly(initial.nextInspectionAt),
    );

    return patch;
  };

  const submit = async () => {
    if (
      vacateDateChangeInvalid(form.vacateDate, initial.vacateDate, form.vacateDateChangeReason)
    ) {
      toast.error('Provide a reason when changing the vacate date');
      return;
    }

    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      toast.message('No changes to save');
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await propertyRegistryApi.update(propertyId, patch);
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
          <DialogDescription>Tenant contact and key tenancy dates.</DialogDescription>
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
              <Label htmlFor="rent-paid-until">Rent paid to</Label>
              <Input
                id="rent-paid-until"
                type="date"
                value={form.rentPaidUntil}
                onChange={(e) => set('rentPaidUntil', e.target.value)}
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
            <PropertyVacateDateField
              date={form.vacateDate}
              initialDate={initial.vacateDate}
              reason={form.vacateDateChangeReason}
              onDateChange={(value) => set('vacateDate', value)}
              onReasonChange={(value) => set('vacateDateChangeReason', value)}
            />
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
