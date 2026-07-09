'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChecklistUploadState } from '@/components/agent/document-checklist-upload';
import { cn } from '@/lib/utils';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

export const MANAGEMENT_DOC_SLOTS = [
  { id: 'landlord_insurance', label: 'Landlord insurance' },
  { id: 'insurance_certificate', label: 'Certificate of insurance' },
  { id: 'management_agreement', label: 'Property management agreement' },
] as const;

export type ManagementRateGst = '' | 'include' | 'exclude';

export interface ManagementDetailsValues {
  landlordInsuranceExpiry: string;
  administrationFee: string;
  documentationFee: string;
  lettingFee: string;
  managementRatePercent: string;
  managementRateGst: ManagementRateGst;
  uploads: ChecklistUploadState;
}

export const EMPTY_MANAGEMENT_DETAILS: ManagementDetailsValues = {
  landlordInsuranceExpiry: '',
  administrationFee: '',
  documentationFee: '',
  lettingFee: '',
  managementRatePercent: '',
  managementRateGst: '',
  uploads: {},
};

const GST_OPTIONS: { value: ManagementRateGst; label: string }[] = [
  { value: '', label: 'Select GST' },
  { value: 'include', label: 'Include GST' },
  { value: 'exclude', label: 'Exclude GST' },
];

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
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

export function PropertyManagementDetailsSection({
  values,
  onChange,
  onUploadFile,
  disabled,
}: {
  values: ManagementDetailsValues;
  onChange: (patch: Partial<ManagementDetailsValues>) => void;
  onUploadFile: (file: File, slotId: string) => Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof ManagementDetailsValues>(key: K, value: ManagementDetailsValues[K]) =>
    onChange({ [key]: value });

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

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Management details</p>
        <p className="text-muted-foreground text-xs">
          Insurance, management agreement, and fee schedule for this property.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv"
        onChange={(e) => void onFile(e.target.files)}
      />

      <FormField label="Landlord insurance expiry date">
        <Input
          type="date"
          value={values.landlordInsuranceExpiry}
          onChange={(e) => set('landlordInsuranceExpiry', e.target.value)}
          disabled={disabled}
        />
      </FormField>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Documents
        </p>
        <div className="space-y-2">
          {MANAGEMENT_DOC_SLOTS.map((slot) => (
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
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField label="Administration fee ($)">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={values.administrationFee}
            onChange={(e) => set('administrationFee', e.target.value)}
            placeholder="0.00"
            disabled={disabled}
          />
        </FormField>
        <FormField label="Documentation fee ($)">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={values.documentationFee}
            onChange={(e) => set('documentationFee', e.target.value)}
            placeholder="0.00"
            disabled={disabled}
          />
        </FormField>
        <FormField label="Letting fee ($)">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={values.lettingFee}
            onChange={(e) => set('lettingFee', e.target.value)}
            placeholder="0.00"
            disabled={disabled}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <FormField label="Management rate / fee (%)">
          <Input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={values.managementRatePercent}
            onChange={(e) => set('managementRatePercent', e.target.value)}
            placeholder="e.g. 5.5"
            disabled={disabled}
          />
        </FormField>
        <FormField label="GST">
          <select
            value={values.managementRateGst}
            onChange={(e) => set('managementRateGst', e.target.value as ManagementRateGst)}
            className={cn(selectClass, 'min-w-[9.5rem]')}
            disabled={disabled}
          >
            {GST_OPTIONS.map((opt) => (
              <option key={opt.value || 'empty'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </div>
  );
}
