'use client';

import { useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChecklistUploadState } from '@/components/agent/document-checklist-upload';
import {
  bondFromWeekly,
  depositFromWeekly,
  RENT_PERIOD_OPTIONS,
  weeklyRentFromAmount,
} from '@/lib/rent-calculations';
import {
  LEASING_CYCLE_BOND_RENT_MULTIPLIER,
  LEASING_CYCLE_DEPOSIT_RENT_MULTIPLIER,
} from '@/lib/property-form-prefill';
import type { RentPeriodChoice } from '@/lib/rent-calculations';
import { cn } from '@/lib/utils';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

export const LEASING_FIXED_DOC_SLOTS = [
  { id: 'lease_agreement', label: 'Lease agreement' },
  { id: 'lease_extension', label: 'Lease extension agreement' },
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
}

export interface LeasingDetailsValues {
  rentAmount: string;
  rentPeriod: RentPeriodChoice;
  agreementStart: string;
  agreementEnd: string;
  nextRentReview: string;
  uploads: ChecklistUploadState;
  extraDocuments: ExtraLeasingDocumentRow[];
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
    <div className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2">
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
        className="h-8 shrink-0 text-xs"
        disabled={disabled || uploading}
        onClick={onUpload}
      >
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        <span className="ml-1">{files.length ? 'Add' : 'Upload'}</span>
      </Button>
    </div>
  );
}

export function PropertyLeasingDetailsSection({
  values,
  onChange,
  onUploadFile,
  required = false,
  disabled,
}: {
  values: LeasingDetailsValues;
  onChange: (patch: Partial<LeasingDetailsValues>) => void;
  onUploadFile: (file: File, slotId: string) => Promise<void>;
  required?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const weeklyRent = useMemo(
    () => weeklyRentFromAmount(Number(values.rentAmount), values.rentPeriod),
    [values.rentAmount, values.rentPeriod],
  );
  const bondAmount = useMemo(() => bondFromWeekly(weeklyRent), [weeklyRent]);
  const depositAmount = useMemo(() => depositFromWeekly(weeklyRent), [weeklyRent]);

  const triggerUpload = (slotId: string) => {
    setActiveSlot(slotId);
    inputRef.current?.click();
  };

  const onFile = async (fileList: FileList | null) => {
    if (!fileList?.length || !activeSlot) return;
    setUploading(true);
    try {
      await onUploadFile(fileList[0], activeSlot);
      toast.success(`Uploaded ${fileList[0].name}`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setActiveSlot(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const addExtraDocument = () => {
    onChange({
      extraDocuments: [
        ...values.extraDocuments,
        { id: `extra-${Date.now()}`, docType: OTHER_LEASING_DOCUMENT_OPTIONS[0].id },
      ],
    });
  };

  const updateExtraDocType = (id: string, docType: string) => {
    onChange({
      extraDocuments: values.extraDocuments.map((row) =>
        row.id === id ? { ...row, docType } : row,
      ),
    });
  };

  const removeExtraDocument = (id: string) => {
    const nextUploads = { ...values.uploads };
    delete nextUploads[id];
    onChange({
      extraDocuments: values.extraDocuments.filter((row) => row.id !== id),
      uploads: nextUploads,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Leasing details</p>
        <p className="text-muted-foreground text-xs">
          Rent, agreement dates, and leasing documents for this tenancy.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv"
        onChange={(e) => void onFile(e.target.files)}
      />

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Documents
        </p>
        <div className="space-y-2">
          {LEASING_FIXED_DOC_SLOTS.map((slot) => (
            <UploadRow
              key={slot.id}
              label={slot.label}
              files={values.uploads[slot.id] ?? []}
              disabled={disabled}
              uploading={uploading && activeSlot === slot.id}
              onUpload={() => triggerUpload(slot.id)}
            />
          ))}
        </div>

        {values.extraDocuments.length > 0 ? (
          <div className="space-y-2">
            {values.extraDocuments.map((row) => (
              <div key={row.id} className="space-y-2 rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2">
                  <select
                    value={row.docType}
                    onChange={(e) => updateExtraDocType(row.id, e.target.value)}
                    className={cn(selectClass, 'flex-1')}
                    disabled={disabled}
                  >
                    {OTHER_LEASING_DOCUMENT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    disabled={disabled}
                    onClick={() => removeExtraDocument(row.id)}
                    aria-label="Remove document row"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <UploadRow
                  label={
                    OTHER_LEASING_DOCUMENT_OPTIONS.find((o) => o.id === row.docType)?.label ??
                    'Document'
                  }
                  files={values.uploads[row.id] ?? []}
                  disabled={disabled}
                  uploading={uploading && activeSlot === row.id}
                  onUpload={() => triggerUpload(row.id)}
                />
              </div>
            ))}
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={disabled}
          onClick={addExtraDocument}
        >
          <Plus className="size-3.5" />
          Add leasing document
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Bond ($)">
          <Input
            readOnly
            value={bondAmount > 0 ? String(bondAmount) : ''}
            placeholder="Auto from rent"
            className="bg-muted/40"
          />
        </FormField>
        <FormField label="Deposit ($)">
          <Input
            readOnly
            value={depositAmount > 0 ? String(depositAmount) : ''}
            placeholder="Auto from rent"
            className="bg-muted/40"
          />
        </FormField>
      </div>
      {weeklyRent > 0 ? (
        <p className="text-muted-foreground text-xs">
          Stored as ${weeklyRent.toFixed(2)}/week · bond is {LEASING_CYCLE_BOND_RENT_MULTIPLIER} weeks
          rent · deposit is {LEASING_CYCLE_DEPOSIT_RENT_MULTIPLIER} weeks rent
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <FormField label="Next rent review" required={required}>
          <Input
            type="date"
            value={values.nextRentReview}
            onChange={(e) => onChange({ nextRentReview: e.target.value })}
            disabled={disabled}
          />
        </FormField>
      </div>
    </div>
  );
}
