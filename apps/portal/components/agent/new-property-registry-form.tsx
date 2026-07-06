'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContactPartyList } from '@/components/agent/contact-party-list';
import { PropertyAddressAutocomplete } from '@/components/agent/property-address-autocomplete';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  AUSTRALIAN_STATE_LABEL,
  AUSTRALIAN_STATE_ORDER,
  type AustralianStateKey,
  PROPERTY_STATUS,
  PROPERTY_STATUS_LABEL,
  PROPERTY_STATUS_ORDER,
  PROPERTY_TYPE,
  PROPERTY_TYPE_LABEL,
  PROPERTY_TYPE_ORDER,
  type PropertyStatus,
  type PropertyType,
} from '@/constants/api-enums';
import type { ParsedAustralianAddress } from '@/lib/google-places';
import { emptyPartyContact } from '@/lib/property-parties';
import type { Property, PropertyPartyContact } from '@/lib/types';
import { cn } from '@/lib/utils';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

function FormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-rose-600 dark:text-rose-400"> *</span>}
      </Label>
      {children}
    </div>
  );
}

export interface NewPropertyRegistryValues {
  agencyName: string;
  agencyCompany: string;
  address: string;
  suburb: string;
  state: AustralianStateKey | '';
  postcode: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  landlords: PropertyPartyContact[];
  tenants: PropertyPartyContact[];
}

function mapStatusToLeaseStatus(status: PropertyStatus): Property['leaseStatus'] {
  if (status === PROPERTY_STATUS.OCCUPIED) return 'active';
  return 'vacant';
}

const parseCount = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function NewPropertyRegistryForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (values: NewPropertyRegistryValues) => void | Promise<void>;
  submitting: boolean;
}) {
  const { primaryAgency, loading, apiConnected } = useAgentData();
  const agencyLocked = !!primaryAgency;
  const [form, setForm] = useState<NewPropertyRegistryValues>({
    agencyName: primaryAgency?.name ?? '',
    agencyCompany: primaryAgency?.company ?? '',
    address: '',
    suburb: '',
    state: '',
    postcode: '',
    propertyType: PROPERTY_TYPE.APARTMENT,
    status: PROPERTY_STATUS.VACANT,
    bedrooms: '',
    bathrooms: '',
    parking: '',
    landlords: [emptyPartyContact()],
    tenants: [emptyPartyContact()],
  });

  const set = <K extends keyof NewPropertyRegistryValues>(key: K, value: NewPropertyRegistryValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!primaryAgency) return;
    setForm((f) => ({
      ...f,
      agencyName: primaryAgency.name,
      agencyCompany: primaryAgency.company ?? '',
    }));
  }, [primaryAgency]);

  if (apiConnected && loading && !primaryAgency) {
    return (
      <p className="text-muted-foreground text-sm">Loading your agency details…</p>
    );
  }

  const handlePlaceSelect = (parsed: ParsedAustralianAddress) => {
    setForm((f) => ({
      ...f,
      address: parsed.address || f.address,
      suburb: parsed.suburb || f.suburb,
      state: parsed.state || f.state,
      postcode: parsed.postcode || f.postcode,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit({
      ...form,
      agencyName: agencyLocked ? (primaryAgency?.name ?? form.agencyName) : form.agencyName,
      agencyCompany: agencyLocked
        ? (primaryAgency?.company ?? form.agencyCompany)
        : form.agencyCompany,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Creates a property in the registry. The same record links to leasing, end leasing,
        maintenance, inspections, and accounting.
      </p>

      <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Agency details
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Agency name" required>
            <Input
              value={agencyLocked ? (primaryAgency?.name ?? '') : form.agencyName}
              onChange={(e) => set('agencyName', e.target.value)}
              readOnly={agencyLocked}
              disabled={agencyLocked}
              className={agencyLocked ? 'bg-muted/40' : undefined}
              placeholder="e.g. Skyline Realty"
            />
          </FormField>
          <FormField label="Company">
            <Input
              value={agencyLocked ? (primaryAgency?.company ?? '') : form.agencyCompany}
              onChange={(e) => set('agencyCompany', e.target.value)}
              readOnly={agencyLocked}
              disabled={agencyLocked}
              className={agencyLocked ? 'bg-muted/40' : undefined}
              placeholder="e.g. Skyline Realty Pty Ltd"
            />
          </FormField>
        </div>
        {agencyLocked ? (
          <p className="text-muted-foreground mt-2 text-xs">
            From your profile — shown in crossub_web Clients under this agency.
          </p>
        ) : (
          <p className="text-muted-foreground mt-2 text-xs">
            Onboards your client agency in crossub_web before the property is registered.
          </p>
        )}
      </div>

      <FormField label="Street address" required>
        <PropertyAddressAutocomplete
          value={form.address}
          onChange={(address) => set('address', address)}
          onPlaceSelect={handlePlaceSelect}
          placeholder="66, Berry Street"
        />
      </FormField>

      <FormField label="State / territory" required>
        <select
          value={form.state}
          onChange={(e) => set('state', e.target.value as AustralianStateKey)}
          className={selectClass}
        >
          <option value="">Select state</option>
          {AUSTRALIAN_STATE_ORDER.map((s) => (
            <option key={s} value={s}>
              {s} — {AUSTRALIAN_STATE_LABEL[s]}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Suburb">
          <Input
            value={form.suburb}
            onChange={(e) => set('suburb', e.target.value)}
            placeholder="e.g. Bondi Beach"
          />
        </FormField>
        <FormField label="Postcode">
          <Input
            value={form.postcode}
            onChange={(e) => set('postcode', e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="e.g. 2193"
            inputMode="numeric"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <FormField label="Type" className="col-span-2 sm:col-span-1">
          <select
            value={form.propertyType}
            onChange={(e) => set('propertyType', e.target.value as PropertyType)}
            className={selectClass}
          >
            {PROPERTY_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {PROPERTY_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Status" className="col-span-2 sm:col-span-1">
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value as PropertyStatus)}
            className={selectClass}
          >
            {PROPERTY_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {PROPERTY_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Beds">
          <Input
            type="number"
            min={0}
            value={form.bedrooms}
            onChange={(e) => set('bedrooms', e.target.value)}
            placeholder="0"
          />
        </FormField>
        <FormField label="Baths">
          <Input
            type="number"
            min={0}
            value={form.bathrooms}
            onChange={(e) => set('bathrooms', e.target.value)}
            placeholder="0"
          />
        </FormField>
        <FormField label="Parking">
          <Input
            type="number"
            min={0}
            value={form.parking}
            onChange={(e) => set('parking', e.target.value)}
            placeholder="0"
          />
        </FormField>
      </div>

      <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Landlord (optional)
        </p>
        <ContactPartyList
          title="Landlord"
          asFieldset={false}
          parties={form.landlords}
          onChange={(landlords) => setForm((f) => ({ ...f, landlords }))}
          addLabel="Add another landlord"
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tenant (optional)
        </p>
        <ContactPartyList
          title="Tenant"
          asFieldset={false}
          parties={form.tenants}
          onChange={(tenants) => setForm((f) => ({ ...f, tenants }))}
          addLabel="Add another tenant"
          vacantHint="Leave blank if the property is vacant."
        />
      </div>

      <Button type="button" className="w-full" disabled={submitting} onClick={handleSubmit}>
        {submitting ? 'Saving…' : 'Add property'}
      </Button>
    </div>
  );
}

export { mapStatusToLeaseStatus, parseCount };
