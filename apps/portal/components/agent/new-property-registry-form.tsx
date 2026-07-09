'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContactPartyList } from '@/components/agent/contact-party-list';
import {
  PropertyLeasingDetailsSection,
  type ExtraLeasingDocumentRow,
  type LeasingDetailsValues,
} from '@/components/agent/property-leasing-details-section';
import {
  EMPTY_STRATA_DETAILS,
  PropertyStrataDetailsSection,
  type StrataDetailsValues,
} from '@/components/agent/property-strata-details-section';
import {
  EMPTY_MANAGEMENT_DETAILS,
  PropertyManagementDetailsSection,
  type ManagementDetailsValues,
} from '@/components/agent/property-management-details-section';
import { PropertyAddressAutocomplete } from '@/components/agent/property-address-autocomplete';
import {
  resolveWorkflowStepState,
  WorkflowProgressRail,
} from '@/components/agent/workflow-progress-rail';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  AUSTRALIAN_STATE_LABEL,
  AUSTRALIAN_STATE_ORDER,
  type AustralianStateKey,
  PROPERTY_TYPE_LABEL,
  PROPERTY_TYPE_ORDER,
  type PropertyType,
} from '@/constants/api-enums';
import { getGoogleMapsApiKey } from '@/lib/google-places';
import type { ParsedAustralianAddress } from '@/lib/google-places';
import {
  LEASE_STATUS_FORM_OPTIONS,
  mapLeaseStatusToPropertyStatus,
} from '@/lib/lease-status-options';
import { emptyPartyContact, splitParties } from '@/lib/property-parties';
import type { Property, PropertyPartyContact } from '@/lib/types';
import { cn } from '@/lib/utils';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

const WIZARD_STEPS = ['property', 'tenant', 'landlord'] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

const WIZARD_STEP_LABEL: Record<WizardStep, string> = {
  property: 'Property',
  tenant: 'Tenant',
  landlord: 'Landlord',
};

const EMPTY_LEASING: LeasingDetailsValues = {
  rentAmount: '',
  rentPeriod: '',
  agreementStart: '',
  agreementEnd: '',
  nextRentReview: '',
  uploads: {},
  extraDocuments: [],
};

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

export type FurnishedChoice = '' | 'yes' | 'no';

export interface NewPropertyRegistryValues {
  agencyName: string;
  agencyCompany: string;
  address: string;
  suburb: string;
  state: AustralianStateKey | '';
  postcode: string;
  latitude?: number;
  longitude?: number;
  propertyType: PropertyType | '';
  leaseStatus: Property['leaseStatus'] | '';
  bedrooms: string;
  bathrooms: string;
  parking: string;
  furnished: FurnishedChoice;
  landlords: PropertyPartyContact[];
  tenants: PropertyPartyContact[];
  strata: StrataDetailsValues;
  management: ManagementDetailsValues;
  leasing: LeasingDetailsValues;
}

function mapLeaseStatusToPropertyStatusForApi(
  leaseStatus: Property['leaseStatus'],
): ReturnType<typeof mapLeaseStatusToPropertyStatus> {
  return mapLeaseStatusToPropertyStatus(leaseStatus);
}

const parseCount = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const parseMoney = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const parsePercent = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined;
};

function isCountFilled(raw: string): boolean {
  return raw.trim() !== '' && parseCount(raw) !== undefined;
}

function leasingRequired(form: NewPropertyRegistryValues): boolean {
  return form.leaseStatus !== '' && form.leaseStatus !== 'vacant';
}

function validatePropertyStep(form: NewPropertyRegistryValues): boolean {
  if (!form.address.trim()) {
    toast.error('Street address is required');
    return false;
  }
  if (!form.suburb.trim()) {
    toast.error('Suburb is required');
    return false;
  }
  if (!form.state) {
    toast.error('Select the property state or territory');
    return false;
  }
  if (!form.postcode.trim() || form.postcode.trim().length < 4) {
    toast.error('A valid 4-digit postcode is required');
    return false;
  }
  if (!form.propertyType) {
    toast.error('Select a property type');
    return false;
  }
  if (!form.leaseStatus) {
    toast.error('Select a lease status');
    return false;
  }
  if (!form.furnished) {
    toast.error('Select furnished or unfurnished');
    return false;
  }
  if (!isCountFilled(form.bedrooms)) {
    toast.error('Bedrooms is required');
    return false;
  }
  if (!isCountFilled(form.bathrooms)) {
    toast.error('Bathrooms is required');
    return false;
  }
  if (!isCountFilled(form.parking)) {
    toast.error('Parking is required');
    return false;
  }
  if (getGoogleMapsApiKey() && (form.latitude == null || form.longitude == null)) {
    toast.error('Select an address from the map search so coordinates are captured');
    return false;
  }
  return true;
}

function validateTenantStep(form: NewPropertyRegistryValues): boolean {
  if (!leasingRequired(form)) return true;

  const { leasing } = form;
  if (!leasing.rentAmount.trim() || Number(leasing.rentAmount) <= 0) {
    toast.error('Rent amount is required');
    return false;
  }
  if (!leasing.rentPeriod) {
    toast.error('Select a rent period');
    return false;
  }
  if (!leasing.agreementStart) {
    toast.error('Agreement start date is required');
    return false;
  }
  if (!leasing.agreementEnd) {
    toast.error('Agreement end date is required');
    return false;
  }
  if (!leasing.nextRentReview) {
    toast.error('Next rent review date is required');
    return false;
  }
  return true;
}

function validateLandlordStep(form: NewPropertyRegistryValues): boolean {
  const landlords = splitParties(form.landlords);
  if (!landlords.primary?.name) {
    toast.error('At least one landlord name is required');
    return false;
  }
  return true;
}

export function NewPropertyRegistryForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (values: NewPropertyRegistryValues) => void | Promise<void>;
  submitting: boolean;
}) {
  const { primaryAgency, loading, apiConnected, uploadDocument } = useAgentData();
  const agencyLocked = !!primaryAgency;
  const [step, setStep] = useState<WizardStep>('property');
  const [form, setForm] = useState<NewPropertyRegistryValues>({
    agencyName: primaryAgency?.name ?? '',
    agencyCompany: primaryAgency?.company ?? '',
    address: '',
    suburb: '',
    state: '',
    postcode: '',
    propertyType: '',
    leaseStatus: '',
    bedrooms: '',
    bathrooms: '',
    parking: '',
    furnished: '',
    landlords: [emptyPartyContact()],
    tenants: [emptyPartyContact()],
    strata: { ...EMPTY_STRATA_DETAILS },
    management: { ...EMPTY_MANAGEMENT_DETAILS },
    leasing: { ...EMPTY_LEASING },
  });

  const set = <K extends keyof NewPropertyRegistryValues>(key: K, value: NewPropertyRegistryValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stepIndex = WIZARD_STEPS.indexOf(step);
  const requireLeasing = leasingRequired(form);

  useEffect(() => {
    if (!primaryAgency) return;
    setForm((f) => ({
      ...f,
      agencyName: primaryAgency.name,
      agencyCompany: primaryAgency.company ?? '',
    }));
  }, [primaryAgency]);

  const handleLeasingUpload = useCallback(
    async (file: File, slotId: string) => {
      const address = form.address.trim()
        ? `${form.address.trim()}, ${form.suburb.trim()}`
        : 'Portfolio';
      uploadDocument(file, 'lease', address);
      setForm((f) => ({
        ...f,
        leasing: {
          ...f.leasing,
          uploads: {
            ...f.leasing.uploads,
            [slotId]: [
              ...(f.leasing.uploads[slotId] ?? []),
              { fileName: file.name, uploadedAt: new Date().toISOString() },
            ],
          },
        },
      }));
    },
    [form.address, form.suburb, uploadDocument],
  );

  const handleManagementUpload = useCallback(
    async (file: File, slotId: string) => {
      const address = form.address.trim()
        ? `${form.address.trim()}, ${form.suburb.trim()}`
        : 'Portfolio';
      uploadDocument(file, 'lease', address);
      setForm((f) => ({
        ...f,
        management: {
          ...f.management,
          uploads: {
            ...f.management.uploads,
            [slotId]: [
              ...(f.management.uploads[slotId] ?? []),
              { fileName: file.name, uploadedAt: new Date().toISOString() },
            ],
          },
        },
      }));
    },
    [form.address, form.suburb, uploadDocument],
  );

  if (apiConnected && loading && !primaryAgency) {
    return (
      <p className="text-muted-foreground text-sm">Loading your agency profile…</p>
    );
  }

  if (apiConnected && !loading && !primaryAgency) {
    return (
      <p className="text-muted-foreground text-sm">
        Your agency profile is not set up yet. Complete registration before adding properties.
      </p>
    );
  }

  const handlePlaceSelect = (parsed: ParsedAustralianAddress) => {
    setForm((f) => ({
      ...f,
      address: parsed.address || f.address,
      suburb: parsed.suburb || f.suburb,
      state: parsed.state || f.state,
      postcode: parsed.postcode || f.postcode,
      latitude: parsed.lat,
      longitude: parsed.lng,
    }));
  };

  const patchLeasing = (patch: Partial<LeasingDetailsValues>) => {
    setForm((f) => ({ ...f, leasing: { ...f.leasing, ...patch } }));
  };

  const patchStrata = (patch: Partial<StrataDetailsValues>) => {
    setForm((f) => ({ ...f, strata: { ...f.strata, ...patch } }));
  };

  const patchManagement = (patch: Partial<ManagementDetailsValues>) => {
    setForm((f) => ({ ...f, management: { ...f.management, ...patch } }));
  };

  const goNext = () => {
    if (step === 'property' && !validatePropertyStep(form)) return;
    if (step === 'tenant' && !validateTenantStep(form)) return;
    const next = WIZARD_STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = WIZARD_STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const handleSubmit = () => {
    if (!validatePropertyStep(form)) {
      setStep('property');
      return;
    }
    if (!validateTenantStep(form)) {
      setStep('tenant');
      return;
    }
    if (!validateLandlordStep(form)) {
      setStep('landlord');
      return;
    }
    void onSubmit({
      ...form,
      agencyName: agencyLocked ? (primaryAgency?.name ?? form.agencyName) : form.agencyName,
      agencyCompany: agencyLocked
        ? (primaryAgency?.company ?? form.agencyCompany)
        : form.agencyCompany,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Creates a property in the registry. The same record links to leasing, end leasing,
        maintenance, inspections, and accounting.
      </p>

      <WorkflowProgressRail
        steps={WIZARD_STEPS}
        labels={WIZARD_STEP_LABEL}
        currentStep={step}
        getStepState={(s) => {
          const idx = WIZARD_STEPS.indexOf(s);
          const isDone = idx < stepIndex;
          return resolveWorkflowStepState(isDone, s === step);
        }}
        isStepCompleted={(s) => WIZARD_STEPS.indexOf(s) < stepIndex}
        onStepClick={(s) => {
          const targetIdx = WIZARD_STEPS.indexOf(s);
          if (targetIdx <= stepIndex) {
            setStep(s);
            return;
          }
          if (targetIdx > 0 && !validatePropertyStep(form)) return;
          if (targetIdx > 1 && !validateTenantStep(form)) return;
          setStep(s);
        }}
        isStepEnabled={(s) => WIZARD_STEPS.indexOf(s) <= stepIndex}
      />

      {step === 'property' ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
          <p className="text-sm font-semibold">Property details</p>

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
              required
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
            <FormField label="Suburb" required>
              <Input
                value={form.suburb}
                onChange={(e) => set('suburb', e.target.value)}
                placeholder="e.g. Bondi Beach"
                required
              />
            </FormField>
            <FormField label="Postcode" required>
              <Input
                value={form.postcode}
                onChange={(e) => set('postcode', e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="e.g. 2193"
                inputMode="numeric"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <FormField label="Type" className="col-span-2 sm:col-span-1" required>
              <select
                value={form.propertyType}
                onChange={(e) => set('propertyType', e.target.value as PropertyType | '')}
                className={selectClass}
                required
              >
                <option value="">Select type</option>
                {PROPERTY_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {PROPERTY_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Lease status" className="col-span-2 sm:col-span-1" required>
              <select
                value={form.leaseStatus}
                onChange={(e) =>
                  set('leaseStatus', e.target.value as Property['leaseStatus'] | '')
                }
                className={selectClass}
                required
              >
                <option value="">Select status</option>
                {LEASE_STATUS_FORM_OPTIONS.map((option, index) => (
                  <option key={`${option.value}-${option.label}-${index}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Beds" required>
              <Input
                type="number"
                min={0}
                value={form.bedrooms}
                onChange={(e) => set('bedrooms', e.target.value)}
                placeholder="0"
                required
              />
            </FormField>
            <FormField label="Baths" required>
              <Input
                type="number"
                min={0}
                value={form.bathrooms}
                onChange={(e) => set('bathrooms', e.target.value)}
                placeholder="0"
                required
              />
            </FormField>
            <FormField label="Parking" required>
              <Input
                type="number"
                min={0}
                value={form.parking}
                onChange={(e) => set('parking', e.target.value)}
                placeholder="0"
                required
              />
            </FormField>
          </div>

          <FormField label="Furnished" required>
            <select
              value={form.furnished}
              onChange={(e) => set('furnished', e.target.value as FurnishedChoice)}
              className={selectClass}
              required
            >
              <option value="">Select…</option>
              <option value="no">Unfurnished</option>
              <option value="yes">Furnished</option>
            </select>
          </FormField>
        </div>
      ) : null}

      {step === 'tenant' ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            <p className="mb-2.5 text-sm font-semibold">Tenant details</p>
            <p className="text-muted-foreground mb-3 text-xs">
              Tenant contact details are optional when creating a property — add them now or
              later. For occupied properties you will typically add at least one tenant before
              leasing is finalised.
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

          <PropertyLeasingDetailsSection
            values={form.leasing}
            onChange={patchLeasing}
            onUploadFile={handleLeasingUpload}
            required={requireLeasing}
            disabled={submitting}
          />
        </div>
      ) : null}

      {step === 'landlord' ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            <p className="mb-2.5 text-sm font-semibold">
              Landlord details <span className="text-rose-600 dark:text-rose-400">*</span>
            </p>
            <p className="text-muted-foreground mb-3 text-xs">
              At least one landlord name is required.
            </p>
            <ContactPartyList
              title="Landlord"
              asFieldset={false}
              parties={form.landlords}
              onChange={(landlords) => setForm((f) => ({ ...f, landlords }))}
              addLabel="Add another landlord"
            />
          </div>

          <PropertyManagementDetailsSection
            values={form.management}
            onChange={patchManagement}
            onUploadFile={handleManagementUpload}
            disabled={submitting}
          />

          <PropertyStrataDetailsSection
            values={form.strata}
            onChange={patchStrata}
            disabled={submitting}
          />
        </div>
      ) : null}

      <div className="flex gap-2">
        {stepIndex > 0 ? (
          <Button type="button" variant="outline" className="flex-1" onClick={goBack} disabled={submitting}>
            Back
          </Button>
        ) : null}
        {step !== 'landlord' ? (
          <Button type="button" className="flex-1" onClick={goNext} disabled={submitting}>
            Next
          </Button>
        ) : (
          <Button type="button" className="flex-1" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Saving…' : 'Add property'}
          </Button>
        )}
      </div>
    </div>
  );
}

export { parseCount, parseMoney, parsePercent, mapLeaseStatusToPropertyStatusForApi };
export type {
  ExtraLeasingDocumentRow,
  FurnishedChoice,
  LeasingDetailsValues,
  ManagementDetailsValues,
  StrataDetailsValues,
};
