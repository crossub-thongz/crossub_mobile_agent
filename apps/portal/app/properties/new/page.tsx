'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  DocumentChecklistUpload,
  type ChecklistUploadState,
} from '@/components/agent/document-checklist-upload';
import {
  mapLeaseStatusToPropertyStatusForApi,
  NewPropertyRegistryForm,
  parseCount,
  parseMoney,
  parsePercent,
  type NewPropertyRegistryValues,
} from '@/components/agent/new-property-registry-form';
import { bondFromWeekly, depositFromWeekly, weeklyRentFromAmount } from '@/lib/rent-calculations';
import { ContactPartyList } from '@/components/agent/contact-party-list';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import {
  NEW_PROPERTY_DOCUMENT_CHECKLIST,
  TRANSFER_IN_DOCUMENT_CHECKLIST,
} from '@/lib/leasing-workflows/constants';
import { fileToBase64 } from '@/lib/file-upload';
import { uploadDocument as apiUploadDocument } from '@/lib/crossub-api/agent-client';
import type { PropertyImportResult } from '@/lib/property-import';
import { pmsSourceLabel } from '@/lib/property-import';
import { PropertyImportPanel } from '@/components/agent/property-import-panel';
import { emptyPartyContact, splitParties } from '@/lib/property-parties';
import { LEASE_STATUS_FORM_OPTIONS } from '@/lib/lease-status-options';
import type { AgentDocument, Property } from '@/lib/types';
import type { PropertyIntakeMode, RentPeriod } from '@/lib/store';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

const LEASE_STATUS_OPTIONS = LEASE_STATUS_FORM_OPTIONS;

function dailyRentFromWeekly(weekly: number): number {
  if (!weekly || weekly <= 0) return 0;
  return Math.round((weekly / 7) * 100) / 100;
}

export default function AddPropertyPage() {
  const router = useRouter();
  const { addProperty, uploadDocument, apiConnected } = useAgentData();
  const [submitting, setSubmitting] = useState(false);
  const [intakeMode, setIntakeMode] = useState<PropertyIntakeMode>('new');
  const [uploads, setUploads] = useState<ChecklistUploadState>({});
  const [pmsSource, setPmsSource] = useState<string>('');
  const [form, setForm] = useState({
    address: '',
    suburb: '',
    landlords: [emptyPartyContact()],
    tenants: [emptyPartyContact()],
    leaseStatus: 'active' as Property['leaseStatus'],
    rentAmount: '',
    rentPeriod: 'weekly' as RentPeriod,
    leaseStart: '',
    leaseEnd: '',
    bedrooms: '',
    bathrooms: '',
    carSpaces: '',
    propertyType: 'house',
    managementRatePercent: '',
    insuranceProvider: '',
    handoverDate: '',
    previousAgentName: '',
    previousAgentEmail: '',
  });

  const weeklyRent = useMemo(
    () => weeklyRentFromAmount(Number(form.rentAmount), form.rentPeriod),
    [form.rentAmount, form.rentPeriod],
  );
  const dailyRent = useMemo(() => dailyRentFromWeekly(weeklyRent), [weeklyRent]);
  const bondAmount = useMemo(() => bondFromWeekly(weeklyRent), [weeklyRent]);

  const checklist =
    intakeMode === 'transfer_in'
      ? TRANSFER_IN_DOCUMENT_CHECKLIST
      : NEW_PROPERTY_DOCUMENT_CHECKLIST;

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleChecklistUpload = useCallback(
    async (file: File, checklistId: string, category: AgentDocument['category']) => {
      const address = form.address.trim()
        ? `${form.address.trim()}, ${form.suburb.trim()}`
        : 'Portfolio';
      uploadDocument(file, category, address);
      setUploads((prev) => ({
        ...prev,
        [checklistId]: [
          ...(prev[checklistId] ?? []),
          { fileName: file.name, uploadedAt: new Date().toISOString() },
        ],
      }));
    },
    [form.address, form.suburb, uploadDocument],
  );

  const applyImport = (result: PropertyImportResult, files: File[]) => {
    const p = result.prefill;
    setPmsSource(pmsSourceLabel(result.source));
    setForm((f) => ({
      ...f,
      address: p.address ?? f.address,
      suburb: p.suburb ?? f.suburb,
      rentAmount: p.rentWeekly != null ? String(p.rentWeekly) : f.rentAmount,
      rentPeriod: 'weekly',
      bedrooms: p.bedrooms != null ? String(p.bedrooms) : f.bedrooms,
      bathrooms: p.bathrooms != null ? String(p.bathrooms) : f.bathrooms,
      carSpaces: p.carSpaces != null ? String(p.carSpaces) : f.carSpaces,
      landlords: p.homeOwnerName
        ? [
            {
              name: p.homeOwnerName,
              email: p.homeOwnerEmail ?? '',
              phone: p.homeOwnerPhone ?? '',
            },
          ]
        : f.landlords,
      tenants: p.tenantName
        ? [
            {
              name: p.tenantName,
              email: p.tenantEmail ?? '',
              phone: p.tenantPhone ?? '',
            },
          ]
        : f.tenants,
      managementRatePercent:
        p.managementRatePercent != null ? String(p.managementRatePercent) : f.managementRatePercent,
      insuranceProvider: p.insuranceProvider ?? f.insuranceProvider,
      propertyType: p.propertyType ?? f.propertyType,
    }));
    const matched: ChecklistUploadState = {};
    for (const [id, names] of Object.entries(result.matchedDocuments)) {
      matched[id] = names.map((fileName) => ({
        fileName,
        uploadedAt: new Date().toISOString(),
      }));
    }
    setUploads((prev) => ({ ...prev, ...matched }));
    toast.success('Import applied — review fields and upload any missing documents');
    void (async () => {
      if (!apiConnected) return;
      for (const file of files.slice(0, 15)) {
        try {
          const contentBase64 = await fileToBase64(file);
          await apiUploadDocument({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            contentBase64,
            category: 'lease',
          });
        } catch {
          // non-fatal per file
        }
      }
    })();
  };

  const requiredDocsMet = checklist
    .filter((item) => item.required)
    .every((item) => (uploads[item.id]?.length ?? 0) > 0);

  const onSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const landlords = splitParties(form.landlords);
    const tenants = splitParties(form.tenants);
    if (!form.address.trim() || !form.suburb.trim() || !landlords.primary?.name) {
      toast.error('Address, suburb, and at least one landlord name are required');
      return;
    }
    if (intakeMode === 'transfer_in' && !requiredDocsMet) {
      toast.error('Upload all required transfer documents before saving');
      return;
    }
    setSubmitting(true);
    try {
      const property = await addProperty({
        intakeMode,
        address: form.address,
        suburb: form.suburb,
        homeOwnerName: landlords.label,
        homeOwnerEmail: landlords.primary?.email,
        homeOwnerPhone: landlords.primary?.phone,
        additionalLandlords: landlords.additional.length ? landlords.additional : undefined,
        tenantName: tenants.label,
        tenantEmail: tenants.primary?.email,
        tenantPhone: tenants.primary?.phone,
        additionalTenants: tenants.additional.length ? tenants.additional : undefined,
        leaseStatus: form.leaseStatus,
        rentWeekly: weeklyRent,
        rentPeriod: form.rentPeriod,
        leaseStart: form.leaseStart || undefined,
        leaseEnd: form.leaseEnd || undefined,
        bondAmount: bondAmount || undefined,
        bedrooms: Number(form.bedrooms) || undefined,
        bathrooms: Number(form.bathrooms) || undefined,
        carSpaces: Number(form.carSpaces) || undefined,
        propertyType: form.propertyType,
        managementRatePercent: Number(form.managementRatePercent) || undefined,
        insuranceProvider: form.insuranceProvider || undefined,
        handoverDate: form.handoverDate || undefined,
        previousAgentName: form.previousAgentName || undefined,
        previousAgentEmail: form.previousAgentEmail || undefined,
        pmsSource: pmsSource || undefined,
      });
      toast.success('Transfer IN property saved — staff leasing will activate on crossub_web');
      router.push(propertyDetail(property.id));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitNewProperty = async (values: NewPropertyRegistryValues) => {
    const address = values.address.trim();
    if (!address) {
      toast.error('Street address is required');
      return;
    }
    if (!values.state) {
      toast.error('Select the property state or territory');
      return;
    }
    if (!values.agencyName.trim()) {
      toast.error('Agency name is required');
      return;
    }

    setSubmitting(true);
    try {
      const landlords = splitParties(values.landlords);
      const tenants = splitParties(values.tenants);
      const { leasing, strata, management } = values;
      const weeklyRent = weeklyRentFromAmount(Number(leasing.rentAmount), leasing.rentPeriod);
      const property = await addProperty({
        intakeMode: 'new',
        agencyName: values.agencyName.trim(),
        agencyCompany: values.agencyCompany.trim() || undefined,
        address,
        suburb: values.suburb.trim(),
        state: values.state,
        postcode: values.postcode.trim() || undefined,
        homeOwnerName: landlords.primary!.name,
        homeOwnerEmail: landlords.primary?.email,
        homeOwnerPhone: landlords.primary?.phone,
        additionalLandlords: landlords.additional.length ? landlords.additional : undefined,
        tenantName: tenants.label,
        tenantEmail: tenants.primary?.email,
        tenantPhone: tenants.primary?.phone,
        additionalTenants: tenants.additional.length ? tenants.additional : undefined,
        leaseStatus: values.leaseStatus as Property['leaseStatus'],
        rentWeekly: weeklyRent,
        rentPeriod: leasing.rentPeriod || undefined,
        leaseStart: leasing.agreementStart || undefined,
        leaseEnd: leasing.agreementEnd || undefined,
        nextRentReview: leasing.nextRentReview || undefined,
        bondAmount: bondFromWeekly(weeklyRent) || undefined,
        depositAmount: depositFromWeekly(weeklyRent) || undefined,
        bedrooms: parseCount(values.bedrooms),
        bathrooms: parseCount(values.bathrooms),
        carSpaces: parseCount(values.parking),
        furnished: values.furnished === 'yes',
        propertyType: values.propertyType,
        propertyStatus: mapLeaseStatusToPropertyStatusForApi(
          values.leaseStatus as Property['leaseStatus'],
        ),
        latitude: values.latitude,
        longitude: values.longitude,
        buildingName: strata.buildingName.trim() || undefined,
        strataPlanNumber: strata.strataPlanNumber.trim() || undefined,
        buildingManagerName: strata.buildingManagerName.trim() || undefined,
        buildingManagerEmail: strata.buildingManagerEmail.trim() || undefined,
        buildingManagerPhone: strata.buildingManagerContactNumber.trim() || undefined,
        strataContactName: strata.strataName.trim() || undefined,
        strataContactEmail: strata.strataEmail.trim() || undefined,
        strataContactPhone: strata.strataContactNumber.trim() || undefined,
        landlordInsuranceExpiry: management.landlordInsuranceExpiry || undefined,
        administrationFee: parseMoney(management.administrationFee),
        documentationFee: parseMoney(management.documentationFee),
        lettingFee: parseMoney(management.lettingFee),
        managementRatePercent: parsePercent(management.managementRatePercent),
        managementRateGst:
          management.managementRateGst === 'include' || management.managementRateGst === 'exclude'
            ? management.managementRateGst
            : undefined,
      });
      toast.success('Property added — available across leasing, maintenance, and more');
      router.push(propertyDetail(property.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the property');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AgentShell title="Add property" backHref={ROUTES.PROPERTIES} backLabel="Properties">
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm">
          Property intake aligned with Leasing ops: transfer IN from another agent, new leasing
          setup, document checklist, and PropertyMe / PropertyTree one-click import. Live properties
          sync documents to Tenant App and Inspector via crossub_web.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={intakeMode === 'new' ? 'default' : 'outline'}
            onClick={() => setIntakeMode('new')}
          >
            New property
          </Button>
          <Button
            type="button"
            variant={intakeMode === 'transfer_in' ? 'default' : 'outline'}
            onClick={() => setIntakeMode('transfer_in')}
          >
            Transfer IN
          </Button>
        </div>

        {intakeMode === 'new' ? (
          <NewPropertyRegistryForm onSubmit={onSubmitNewProperty} submitting={submitting} />
        ) : (
          <form onSubmit={onSubmitTransfer} className="space-y-5">
            <PropertyImportPanel onImport={applyImport} />

            <fieldset className="space-y-3 rounded-xl border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">Previous agent</legend>
            <div className="space-y-2">
              <Label htmlFor="previousAgentName">Managing agent name</Label>
              <Input
                id="previousAgentName"
                value={form.previousAgentName}
                onChange={(e) => update('previousAgentName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousAgentEmail">Previous agent email</Label>
              <Input
                id="previousAgentEmail"
                type="email"
                value={form.previousAgentEmail}
                onChange={(e) => update('previousAgentEmail', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handoverDate">Handover date</Label>
              <Input
                id="handoverDate"
                type="date"
                value={form.handoverDate}
                onChange={(e) => update('handoverDate', e.target.value)}
              />
            </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">Property</legend>
          <div className="space-y-2">
            <Label htmlFor="address">Street address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="66, Berry Street"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suburb">Suburb</Label>
            <Input
              id="suburb"
              value={form.suburb}
              onChange={(e) => update('suburb', e.target.value)}
              placeholder="e.g. North Sydney"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="managementRatePercent">Management rate (%)</Label>
              <Input
                id="managementRatePercent"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.managementRatePercent}
                onChange={(e) => update('managementRatePercent', e.target.value)}
                placeholder="5.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insuranceProvider">Insurance provider</Label>
              <Input
                id="insuranceProvider"
                value={form.insuranceProvider}
                onChange={(e) => update('insuranceProvider', e.target.value)}
                placeholder="Terri Scheer"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="leaseStatus">Lease status</Label>
            <select
              id="leaseStatus"
              value={form.leaseStatus}
              onChange={(e) =>
                update('leaseStatus', e.target.value as Property['leaseStatus'])
              }
              className={selectClass}
            >
              {LEASE_STATUS_OPTIONS.map((option, index) => (
                <option key={`${option.value}-${option.label}-${index}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="leaseStart">Lease start date</Label>
              <Input
                id="leaseStart"
                type="date"
                value={form.leaseStart}
                onChange={(e) => update('leaseStart', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaseEnd">Lease end date</Label>
              <Input
                id="leaseEnd"
                type="date"
                value={form.leaseEnd}
                onChange={(e) => update('leaseEnd', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Rent ($)</Label>
              <Input
                id="rentAmount"
                type="number"
                min={0}
                step={0.01}
                value={form.rentAmount}
                onChange={(e) => update('rentAmount', e.target.value)}
                placeholder={form.rentPeriod === 'weekly' ? '650' : '2817'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentPeriod">Period</Label>
              <select
                id="rentPeriod"
                value={form.rentPeriod}
                onChange={(e) => update('rentPeriod', e.target.value as RentPeriod)}
                className={`${selectClass} min-w-[7.5rem]`}
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dailyRent">Daily rent ($)</Label>
              <Input
                id="dailyRent"
                type="text"
                readOnly
                value={dailyRent > 0 ? dailyRent.toFixed(2) : ''}
                placeholder="Auto from rent"
                className="bg-muted/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bondAmount">Bond ($)</Label>
              <Input
                id="bondAmount"
                type="text"
                readOnly
                value={bondAmount > 0 ? String(bondAmount) : ''}
                placeholder="4 × weekly rent"
                className="bg-muted/40"
              />
            </div>
          </div>
          {weeklyRent > 0 ? (
            <p className="text-muted-foreground text-xs">
              Stored as ${weeklyRent.toFixed(2)}/week · bond is 4 weeks rent
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                min={0}
                value={form.bedrooms}
                onChange={(e) => update('bedrooms', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min={0}
                value={form.bathrooms}
                onChange={(e) => update('bathrooms', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carSpaces">Car spaces</Label>
              <Input
                id="carSpaces"
                type="number"
                min={0}
                value={form.carSpaces}
                onChange={(e) => update('carSpaces', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyType">Property type</Label>
            <select
              id="propertyType"
              value={form.propertyType}
              onChange={(e) => update('propertyType', e.target.value)}
              className={selectClass}
            >
              <option value="house">House</option>
              <option value="unit">Unit / Apartment</option>
              <option value="townhouse">Townhouse</option>
            </select>
          </div>
        </fieldset>

        <ContactPartyList
          title="Landlord"
          parties={form.landlords}
          onChange={(landlords) => setForm((f) => ({ ...f, landlords }))}
          addLabel="Add another landlord"
        />

        <ContactPartyList
          title="Tenant (optional)"
          parties={form.tenants}
          onChange={(tenants) => setForm((f) => ({ ...f, tenants }))}
          addLabel="Add another tenant"
          vacantHint="Leave names blank if the property is vacant."
        />

        <fieldset className="space-y-3 rounded-xl border bg-card p-4">
          <legend className="px-1 text-sm font-semibold">Documents</legend>
          <DocumentChecklistUpload
            checklist={checklist}
            uploads={uploads}
            onUpload={handleChecklistUpload}
          />
        </fieldset>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save transfer IN'}
        </Button>
          </form>
        )}
      </div>
    </AgentShell>
  );
}
