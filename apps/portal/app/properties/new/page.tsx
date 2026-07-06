'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  DocumentChecklistUpload,
  type ChecklistUploadState,
} from '@/components/agent/document-checklist-upload';
import {
  mapStatusToLeaseStatus,
  NewPropertyRegistryForm,
  parseCount,
  type NewPropertyRegistryValues,
} from '@/components/agent/new-property-registry-form';
import { PropertyImportPanel } from '@/components/agent/property-import-panel';
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
import type { AgentDocument, Property } from '@/lib/types';
import type { PropertyIntakeMode } from '@/lib/store';

const LEASE_OPTIONS: Property['leaseStatus'][] = [
  'active',
  'periodic',
  'vacating',
  'vacant',
];

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
    homeOwnerName: '',
    homeOwnerEmail: '',
    homeOwnerPhone: '',
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    leaseStatus: 'active' as Property['leaseStatus'],
    rentWeekly: '',
    bedrooms: '',
    bathrooms: '',
    carSpaces: '',
    bondAmount: '',
    propertyType: 'house',
    managementRatePercent: '',
    insuranceProvider: '',
    handoverDate: '',
    previousAgentName: '',
    previousAgentEmail: '',
  });

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
      rentWeekly: p.rentWeekly != null ? String(p.rentWeekly) : f.rentWeekly,
      bedrooms: p.bedrooms != null ? String(p.bedrooms) : f.bedrooms,
      bathrooms: p.bathrooms != null ? String(p.bathrooms) : f.bathrooms,
      carSpaces: p.carSpaces != null ? String(p.carSpaces) : f.carSpaces,
      bondAmount: p.bondAmount != null ? String(p.bondAmount) : f.bondAmount,
      homeOwnerName: p.homeOwnerName ?? f.homeOwnerName,
      homeOwnerEmail: p.homeOwnerEmail ?? f.homeOwnerEmail,
      homeOwnerPhone: p.homeOwnerPhone ?? f.homeOwnerPhone,
      tenantName: p.tenantName ?? f.tenantName,
      tenantEmail: p.tenantEmail ?? f.tenantEmail,
      tenantPhone: p.tenantPhone ?? f.tenantPhone,
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
    if (!form.address.trim() || !form.suburb.trim() || !form.homeOwnerName.trim()) {
      toast.error('Address, suburb, and landlord name are required');
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
        homeOwnerName: form.homeOwnerName,
        homeOwnerEmail: form.homeOwnerEmail || undefined,
        homeOwnerPhone: form.homeOwnerPhone || undefined,
        tenantName: form.tenantName || 'Vacant',
        tenantEmail: form.tenantEmail || undefined,
        tenantPhone: form.tenantPhone || undefined,
        leaseStatus: form.leaseStatus,
        rentWeekly: Number(form.rentWeekly) || 0,
        bedrooms: Number(form.bedrooms) || undefined,
        bathrooms: Number(form.bathrooms) || undefined,
        carSpaces: Number(form.carSpaces) || undefined,
        bondAmount: Number(form.bondAmount) || undefined,
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

    setSubmitting(true);
    try {
      const property = await addProperty({
        intakeMode: 'new',
        address,
        suburb: values.suburb.trim(),
        state: values.state,
        postcode: values.postcode.trim() || undefined,
        homeOwnerName: values.landlordName.trim() || 'TBC',
        homeOwnerEmail: values.landlordEmail.trim() || undefined,
        homeOwnerPhone: values.landlordPhone.trim() || undefined,
        tenantName: values.tenantName.trim() || 'Vacant',
        tenantEmail: values.tenantEmail.trim() || undefined,
        tenantPhone: values.tenantPhone.trim() || undefined,
        leaseStatus: mapStatusToLeaseStatus(values.status),
        rentWeekly: 0,
        bedrooms: parseCount(values.bedrooms),
        bathrooms: parseCount(values.bathrooms),
        carSpaces: parseCount(values.parking),
        propertyType: values.propertyType,
        propertyStatus: values.status,
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property type</Label>
              <select
                id="propertyType"
                value={form.propertyType}
                onChange={(e) => update('propertyType', e.target.value)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30"
              >
                <option value="house">House</option>
                <option value="unit">Unit / Apartment</option>
                <option value="townhouse">Townhouse</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bondAmount">Bond ($)</Label>
              <Input
                id="bondAmount"
                type="number"
                min={0}
                value={form.bondAmount}
                onChange={(e) => update('bondAmount', e.target.value)}
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
