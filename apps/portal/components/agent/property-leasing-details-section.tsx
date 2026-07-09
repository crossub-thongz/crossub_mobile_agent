'use client';

import { useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChecklistUploadState } from '@/components/agent/document-checklist-upload';
import {
  MANAGEMENT_DOC_SLOTS,
  type ManagementDetailsValues,
} from '@/components/agent/property-management-details-section';
import {
  bondFromWeekly,
  RENT_PERIOD_OPTIONS,
  weeklyRentFromAmount,
} from '@/lib/rent-calculations';
import type { RentPeriodChoice } from '@/lib/rent-calculations';
import { cn } from '@/lib/utils';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

export const LEASING_FIXED_DOC_SLOTS = [
  { id: 'lease_agreement', label: 'Lease agreement' },
  { id: 'lease_extension', label: 'Lease extension agreement' },
  { id: 'application_form', label: 'Application Form' },
  { id: 'photo_id', label: 'Photo ID' },
  { id: 'bank_statement', label: 'Bank Statement' },
  { id: 'tenancy_ledger', label: 'Tenancy Ledger' },
  { id: 'visa', label: 'Visa' },
  { id: 'payslip', label: 'Payslip' },
] as const;

export const PROPERTY_FIXED_DOC_SLOTS = [
  { id: 'council_rate', label: 'Council rate' },
  { id: 'strata_levy', label: 'Strata levy' },
  { id: 'water_bill', label: 'Water bill' },
  { id: 'property_landlord_insurance', label: 'Landlord insurance' },
  { id: 'water_efficiency_certificate', label: 'Water Efficiency Certificate' },
  { id: 'smoke_alarm_compliance', label: 'Smoke alarm compliance' },
] as const;

export const OTHER_LEASING_DOCUMENT_OPTIONS = [
  { id: 'application_documents', label: 'Application documents' },
  { id: 'bond_lodgement', label: 'Bond lodgement' },
  { id: 'ingoing_report', label: 'Ingoing inspection report' },
  { id: 'rent_ledger', label: 'Rent ledger' },
  { id: 'other', label: 'Other' },
] as const;

export interface ExtraLeasingDocumentRow {
  id: string;
  docType: string;
  /** Required when docType is `other` — stored as PortalDocument.name on upload. */
  title: string;
}

export interface LeasingDetailsValues {
  rentAmount: string;
  rentPeriod: RentPeriodChoice;
  agreementStart: string;
  agreementEnd: string;
  uploads: ChecklistUploadState;
  extraDocuments: ExtraLeasingDocumentRow[];
  /** Extra rows under Property documents (Optional). */
  extraPropertyDocuments: ExtraLeasingDocumentRow[];
}

export function resolveLeasingDocumentTitle(row: ExtraLeasingDocumentRow): string {
  if (row.docType === 'other') return row.title.trim();
  const preset = OTHER_LEASING_DOCUMENT_OPTIONS.find((o) => o.id === row.docType)?.label;
  return preset || row.title.trim() || 'Document';
}

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

function UploadRow({
  label,
  files,
  disabled,
  uploading,
  onUpload,
}: {
  label: string;
  files: { fileName: string; uploadedAt: string }[];
  disabled?: boolean;
  uploading?: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-primary/15 bg-primary/[0.02] px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {files.length > 0 ? (
          <p className="text-muted-foreground truncate text-xs">
            {files.map((f) => f.fileName).join(', ')}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">Not uploaded</p>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant={files.length ? 'outline' : 'default'}
        className={cn(
          'h-8 shrink-0 text-xs',
          files.length
            ? 'border-primary/40 text-primary hover:bg-primary/10'
            : 'bg-primary text-primary-foreground hover:bg-primary/90',
        )}
        disabled={disabled || uploading}
        onClick={onUpload}
      >
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        <span className="ml-1">{files.length ? 'Add' : 'Upload'}</span>
      </Button>
    </div>
  );
}

function DocumentChecklistSection({
  title,
  description,
  addLabel,
  fixedSlots,
  extraDocuments,
  uploads,
  onChangeExtras,
  onChangeUploads,
  onUploadFile,
  disabled,
  extraIdPrefix,
}: {
  title: string;
  description: string;
  addLabel: string;
  fixedSlots: readonly { id: string; label: string }[];
  extraDocuments: ExtraLeasingDocumentRow[];
  uploads: ChecklistUploadState;
  onChangeExtras: (rows: ExtraLeasingDocumentRow[]) => void;
  onChangeUploads: (uploads: ChecklistUploadState) => void;
  onUploadFile: (file: File, slotId: string, title?: string) => Promise<void>;
  disabled?: boolean;
  extraIdPrefix: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const triggerUpload = (slotId: string) => {
    if (slotId.startsWith(extraIdPrefix)) {
      const row = extraDocuments.find((r) => r.id === slotId);
      if (row && !row.title.trim()) {
        toast.error('Enter a document title before uploading');
        return;
      }
    }
    setActiveSlot(slotId);
    inputRef.current?.click();
  };

  const onFile = async (fileList: FileList | null) => {
    if (!fileList?.length || !activeSlot) return;
    const files = Array.from(fileList);
    setUploading(true);
    try {
      let title: string | undefined;
      const fixed = fixedSlots.find((s) => s.id === activeSlot);
      if (fixed) {
        title = fixed.label;
      } else {
        const row = extraDocuments.find((r) => r.id === activeSlot);
        if (row) title = row.title.trim() || 'Document';
      }
      for (const file of files) {
        await onUploadFile(file, activeSlot, title);
      }
      toast.success(
        files.length === 1
          ? `Uploaded ${files[0].name}`
          : `Uploaded ${files.length} files`,
      );
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setActiveSlot(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const addExtraDocument = () => {
    onChangeExtras([
      ...extraDocuments,
      { id: `${extraIdPrefix}${Date.now()}`, docType: 'other', title: '' },
    ]);
  };

  const updateExtraDoc = (id: string, title: string) => {
    onChangeExtras(extraDocuments.map((row) => (row.id === id ? { ...row, title } : row)));
  };

  const removeExtraDocument = (id: string) => {
    const nextUploads = { ...uploads };
    delete nextUploads[id];
    onChangeExtras(extraDocuments.filter((row) => row.id !== id));
    onChangeUploads(nextUploads);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-primary/10 -mt-1 h-8 shrink-0 px-2 text-xs font-medium"
          disabled={disabled}
          onClick={addExtraDocument}
        >
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv"
        onChange={(e) => void onFile(e.target.files)}
      />

      <div className="space-y-2">
        {fixedSlots.map((slot) => (
          <UploadRow
            key={slot.id}
            label={slot.label}
            files={uploads[slot.id] ?? []}
            disabled={disabled}
            uploading={uploading && activeSlot === slot.id}
            onUpload={() => triggerUpload(slot.id)}
          />
        ))}
      </div>

      {extraDocuments.length > 0 ? (
        <div className="space-y-2">
          {extraDocuments.map((row) => (
            <div key={row.id} className="space-y-2 rounded-lg border border-primary/15 px-3 py-2">
              <div className="flex items-start gap-2">
                <FormField label="Document title" required className="min-w-0 flex-1">
                  <Input
                    value={row.title}
                    onChange={(e) => updateExtraDoc(row.id, e.target.value)}
                    placeholder="e.g. Special condition addendum"
                    disabled={disabled}
                  />
                </FormField>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive mt-6 size-8 shrink-0"
                  disabled={disabled}
                  onClick={() => removeExtraDocument(row.id)}
                  aria-label="Remove document row"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <UploadRow
                label={row.title.trim() || 'Other document'}
                files={uploads[row.id] ?? []}
                disabled={disabled}
                uploading={uploading && activeSlot === row.id}
                onUpload={() => triggerUpload(row.id)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PropertyLeasingDetailsSection({
  values,
  onChange,
  required = false,
  disabled,
}: {
  values: LeasingDetailsValues;
  onChange: (patch: Partial<LeasingDetailsValues>) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const weeklyRent = useMemo(
    () => weeklyRentFromAmount(Number(values.rentAmount), values.rentPeriod),
    [values.rentAmount, values.rentPeriod],
  );
  const bondAmount = useMemo(() => bondFromWeekly(weeklyRent), [weeklyRent]);

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Leasing details</p>
        <p className="text-muted-foreground text-xs">
          Rent, bond, and agreement dates for this tenancy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <FormField label="Rent ($)" required={required}>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={values.rentAmount}
            onChange={(e) => onChange({ rentAmount: e.target.value })}
            placeholder={
              values.rentPeriod === 'monthly'
                ? '2817'
                : values.rentPeriod === 'fortnightly'
                  ? '1300'
                  : values.rentPeriod === 'weekly'
                    ? '650'
                    : 'Enter rent'
            }
            disabled={disabled}
          />
        </FormField>
        <FormField label="Period" required={required}>
          <select
            value={values.rentPeriod}
            onChange={(e) => onChange({ rentPeriod: e.target.value as RentPeriodChoice })}
            className={cn(selectClass, 'min-w-[7.5rem]')}
            disabled={disabled}
          >
            <option value="">Select period</option>
            {RENT_PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Bond ($)">
          <Input
            readOnly
            value={bondAmount > 0 ? String(bondAmount) : ''}
            placeholder="Auto from rent"
            className="bg-muted/40"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Agreement start" required={required}>
          <Input
            type="date"
            value={values.agreementStart}
            onChange={(e) => onChange({ agreementStart: e.target.value })}
            disabled={disabled}
          />
        </FormField>
        <FormField label="Agreement end" required={required}>
          <Input
            type="date"
            value={values.agreementEnd}
            onChange={(e) => onChange({ agreementEnd: e.target.value })}
            disabled={disabled}
          />
        </FormField>
      </div>
    </div>
  );
}

export function PropertyDocumentsSection({
  values,
  onChange,
  management,
  onChangeManagement,
  onUploadFile,
  onUploadManagementFile,
  disabled,
}: {
  values: LeasingDetailsValues;
  onChange: (patch: Partial<LeasingDetailsValues>) => void;
  management: ManagementDetailsValues;
  onChangeManagement: (patch: Partial<ManagementDetailsValues>) => void;
  onUploadFile: (file: File, slotId: string, title?: string) => Promise<void>;
  onUploadManagementFile: (file: File, slotId: string, title?: string) => Promise<void>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <DocumentChecklistSection
        title="Tenant's Application Documents (Optional)"
        description="Lease agreements and supporting tenancy application documents."
        addLabel="Add document"
        fixedSlots={LEASING_FIXED_DOC_SLOTS}
        extraDocuments={values.extraDocuments}
        uploads={values.uploads}
        onChangeExtras={(extraDocuments) => onChange({ extraDocuments })}
        onChangeUploads={(uploads) => onChange({ uploads })}
        onUploadFile={onUploadFile}
        disabled={disabled}
        extraIdPrefix="extra-tenant-"
      />

      <DocumentChecklistSection
        title="Landlord's Documents (Optional)"
        description="Insurance and management agreement documents for the landlord."
        addLabel="Add document"
        fixedSlots={MANAGEMENT_DOC_SLOTS}
        extraDocuments={management.extraDocuments}
        uploads={management.uploads}
        onChangeExtras={(extraDocuments) => onChangeManagement({ extraDocuments })}
        onChangeUploads={(uploads) => onChangeManagement({ uploads })}
        onUploadFile={onUploadManagementFile}
        disabled={disabled}
        extraIdPrefix="extra-landlord-"
      />

      <DocumentChecklistSection
        title="Property Documents (Optional)"
        description="Rates, utilities, insurance, and compliance certificates for this property."
        addLabel="Add document"
        fixedSlots={PROPERTY_FIXED_DOC_SLOTS}
        extraDocuments={values.extraPropertyDocuments}
        uploads={values.uploads}
        onChangeExtras={(extraPropertyDocuments) => onChange({ extraPropertyDocuments })}
        onChangeUploads={(uploads) => onChange({ uploads })}
        onUploadFile={onUploadFile}
        disabled={disabled}
        extraIdPrefix="extra-property-"
      />
    </div>
  );
}
