'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import type { Property } from '@/lib/types';

const LEASE_OPTIONS: Property['leaseStatus'][] = [
  'active',
  'periodic',
  'vacating',
  'vacant',
];

export default function AddPropertyPage() {
  const router = useRouter();
  const { addProperty } = useAgentData();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    address: '',
    suburb: '',
    homeOwnerName: '',
    homeOwnerEmail: '',
    homeOwnerPhone: '',
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    leaseStatus: 'active' as Property['leaseStatus'],
    rentWeekly: '',
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address.trim() || !form.suburb.trim() || !form.homeOwnerName.trim()) {
      toast.error('Address, suburb, and landlord name are required');
      return;
    }
    setSubmitting(true);
    try {
      const property = addProperty({
        address: form.address,
        suburb: form.suburb,
        homeOwnerName: form.homeOwnerName,
        homeOwnerEmail: form.homeOwnerEmail || undefined,
        homeOwnerPhone: form.homeOwnerPhone || undefined,
        tenantName: form.tenantName || 'Vacant',
        tenantEmail: form.tenantEmail || undefined,
        tenantPhone: form.tenantPhone || undefined,
        leaseStatus: form.leaseStatus,
        rentWeekly: Number(form.rentWeekly) || 0,
      });
      toast.success('Property added to your portfolio');
      router.push(propertyDetail(property.id));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AgentShell title="Add property" backHref={ROUTES.PROPERTIES}>
      <form onSubmit={onSubmit} className="space-y-5">
        <p className="text-muted-foreground text-sm">
          Add a property to your portfolio. Saved on this device until connected
          to crossub_web.
        </p>

        <fieldset className="space-y-3 rounded-xl border bg-card p-4">
          <legend className="px-1 text-sm font-semibold">Property</legend>
          <div className="space-y-2">
            <Label htmlFor="address">Street address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="12 Ocean View Pde"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suburb">Suburb</Label>
            <Input
              id="suburb"
              value={form.suburb}
              onChange={(e) => update('suburb', e.target.value)}
              placeholder="Miami"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="leaseStatus">Lease status</Label>
              <select
                id="leaseStatus"
                value={form.leaseStatus}
                onChange={(e) =>
                  update('leaseStatus', e.target.value as Property['leaseStatus'])
                }
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm capitalize outline-none dark:bg-input/30"
              >
                {LEASE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentWeekly">Rent ($/week)</Label>
              <Input
                id="rentWeekly"
                type="number"
                min={0}
                value={form.rentWeekly}
                onChange={(e) => update('rentWeekly', e.target.value)}
                placeholder="650"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border bg-card p-4">
          <legend className="px-1 text-sm font-semibold">Landlord</legend>
          <div className="space-y-2">
            <Label htmlFor="homeOwnerName">Name</Label>
            <Input
              id="homeOwnerName"
              value={form.homeOwnerName}
              onChange={(e) => update('homeOwnerName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="homeOwnerEmail">Email</Label>
            <Input
              id="homeOwnerEmail"
              type="email"
              value={form.homeOwnerEmail}
              onChange={(e) => update('homeOwnerEmail', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="homeOwnerPhone">Phone</Label>
            <Input
              id="homeOwnerPhone"
              value={form.homeOwnerPhone}
              onChange={(e) => update('homeOwnerPhone', e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border bg-card p-4">
          <legend className="px-1 text-sm font-semibold">Tenant (optional)</legend>
          <div className="space-y-2">
            <Label htmlFor="tenantName">Name — leave blank if vacant</Label>
            <Input
              id="tenantName"
              value={form.tenantName}
              onChange={(e) => update('tenantName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenantEmail">Email</Label>
            <Input
              id="tenantEmail"
              type="email"
              value={form.tenantEmail}
              onChange={(e) => update('tenantEmail', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenantPhone">Phone</Label>
            <Input
              id="tenantPhone"
              value={form.tenantPhone}
              onChange={(e) => update('tenantPhone', e.target.value)}
            />
          </div>
        </fieldset>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add property'}
        </Button>
      </form>
    </AgentShell>
  );
}
