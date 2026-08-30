'use client';

import { useRef, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChecklistUploadState } from '@/components/agent/document-checklist-upload';
import {
  StagedDocumentUploadRow,
  type StagedUploadFile,
} from '@/components/agent/staged-document-upload-row';
import type { ManagementDetailsValues } from '@/components/agent/property-management-details-section';
import {
  CREATE_PROPERTY_DOCUMENT_GROUP_LABELS,
  documentSlotsForGroup,
} from '@/lib/property-create-document-groups';
import { OTHER_LEASING_DOCUMENT_OPTIONS } from '@/lib/property-document-slots';
import {
  // bondFromWeekly,
  RENT_PERIOD_OPTIONS,
  // weeklyRentFromAmount,
} from '@/lib/rent-calculations';
import type { RentPeriodChoice } from '@/lib/rent-calculations';
import {
  filterUploadableFiles,
  MAX_UPLOAD_LABEL,
} from '@/lib/file-upload';
import { cn } from '@/lib/utils';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

export {
  LEASING_FIXED_DOC_SLOTS,
  OTHER_LEASING_DOCUMENT_OPTIONS,
  PROPERTY_FIXED_DOC_SLOTS,
} from '@/lib/property-document-slots';

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
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-rose-600 dark:text-rose-400"> *</span>}
      </Label>
      {children}
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
  onPreviewFile,
  onRemoveFile,
  disabled,
  extraIdPrefix,
  stagingOnly,
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
  onPreviewFile?: (file: StagedUploadFile) => void;
  onRemoveFile?: (file: StagedUploadFile, slotId: string) => void;
  disabled?: boolean;
  extraIdPrefix: string;
  stagingOnly?: boolean;
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
    const { ok, oversized, blocked } = filterUploadableFiles(Array.from(fileList));
    if (blocked.length > 0) {
      toast.error(
        blocked.length === 1
          ? `${blocked[0].name} is not supported (videos and GIFs are not allowed)`
          : `${blocked.length} files are not supported (videos and GIFs are not allowed)`,
      );
    }
    if (oversized.length > 0) {
      toast.error(
        oversized.length === 1
          ? `${oversized[0].name} exceeds the ${MAX_UPLOAD_LABEL} limit`
          : `${oversized.length} files exceed the ${MAX_UPLOAD_LABEL} limit`,
      );
    }
    if (ok.length === 0) {
      setActiveSlot(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (!stagingOnly) setUploading(true);
    try {
      let title: string | undefined;
      const fixed = fixedSlots.find((s) => s.id === activeSlot);
      if (fixed) {
        title = fixed.label;
      } else {
        const row = extraDocuments.find((r) => r.id === activeSlot);
        if (row) title = row.title.trim() || 'Document';
      }
      await Promise.all(ok.map((file) => onUploadFile(file, activeSlot, title)));
      if (ok.length > 0) {
        toast.success(
          stagingOnly
            ? ok.length === 1
              ? `Added ${ok[0]!.name}`
              : `Added ${ok.length} files`
            : ok.length === 1
              ? `Uploaded ${ok[0]!.name}`
              : `Uploaded ${ok.length} files`,
        );
      }
    } catch {
      toast.error(stagingOnly ? 'Could not add file' : 'Upload failed');
    } finally {
      if (!stagingOnly) setUploading(false);
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
    const slotFiles = uploads[id] ?? [];
    for (const file of slotFiles) {
      onRemoveFile?.(file, id);
    }
    const nextUploads = { ...uploads };
    delete nextUploads[id];
    onChangeExtras(extraDocuments.filter((row) => row.id !== id));
    onChangeUploads(nextUploads);
  };

  const removeUpload = (slotId: string, file: StagedUploadFile) => {
    onChangeUploads({
      ...uploads,
      [slotId]: (uploads[slotId] ?? []).filter((entry) => entry.id !== file.id),
    });
    onRemoveFile?.(file, slotId);
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
        onChange={(e) => void onFile(e.target.files)}
      />

      <div className="space-y-2">
        {fixedSlots.map((slot) => (
          <StagedDocumentUploadRow
            key={slot.id}
            label={slot.label}
            files={uploads[slot.id] ?? []}
            disabled={disabled}
            uploading={uploading && activeSlot === slot.id}
            onUpload={() => triggerUpload(slot.id)}
            onPreview={onPreviewFile}
            onRemove={(file) => removeUpload(slot.id, file)}
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
              <StagedDocumentUploadRow
                label={row.title.trim() || 'Other document'}
                files={uploads[row.id] ?? []}
                disabled={disabled}
                uploading={uploading && activeSlot === row.id}
                onUpload={() => triggerUpload(row.id)}
                onPreview={onPreviewFile}
                onRemove={(file) => removeUpload(row.id, file)}
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
  // Bond auto-calc — restore with Bond ($) field below
  // const weeklyRent = useMemo(
  //   () => weeklyRentFromAmount(Number(values.rentAmount), values.rentPeriod),
  //   [values.rentAmount, values.rentPeriod],
  // );
  // const bondAmount = useMemo(() => bondFromWeekly(weeklyRent), [weeklyRent]);

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Leasing details</p>
        <p className="text-muted-foreground text-xs">
          Rent and agreement dates for this tenancy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            className={selectClass}
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
        {/* Bond — temporarily hidden on tenant step
        <FormField label="Bond ($)">
          <Input
            readOnly
            value={bondAmount > 0 ? String(bondAmount) : ''}
            placeholder="Auto from rent"
            className="bg-muted/40"
          />
        </FormField>
        */}
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
  onPreviewFile,
  onRemoveFile,
  disabled,
  stagingOnly,
}: {
  values: LeasingDetailsValues;
  onChange: (patch: Partial<LeasingDetailsValues>) => void;
  management: ManagementDetailsValues;
  onChangeManagement: (patch: Partial<ManagementDetailsValues>) => void;
  onUploadFile: (file: File, slotId: string, title?: string) => Promise<void>;
  onUploadManagementFile: (file: File, slotId: string, title?: string) => Promise<void>;
  onPreviewFile?: (file: StagedUploadFile) => void;
  onRemoveFile?: (file: StagedUploadFile, slotId: string) => void;
  disabled?: boolean;
  stagingOnly?: boolean;
}) {
  return (
    <div className="space-y-4">
      {stagingOnly ? (
        <p className="text-muted-foreground text-xs">
          Add files here — they upload on the Documents tab after you complete the property (up
          to {MAX_UPLOAD_LABEL} per file).
        </p>
      ) : null}
      <DocumentChecklistSection
        title={`${CREATE_PROPERTY_DOCUMENT_GROUP_LABELS.tenancy} (Optional)`}
        description="Lease agreement, lease extension, rates, compliance, and other tenancy records."
        addLabel="Add document"
        fixedSlots={documentSlotsForGroup('tenancy')}
        extraDocuments={values.extraPropertyDocuments}
        uploads={values.uploads}
        onChangeExtras={(extraPropertyDocuments) => onChange({ extraPropertyDocuments })}
        onChangeUploads={(uploads) => onChange({ uploads })}
        onUploadFile={onUploadFile}
        onPreviewFile={onPreviewFile}
        onRemoveFile={onRemoveFile}
        disabled={disabled}
        extraIdPrefix="extra-tenancy-"
        stagingOnly={stagingOnly}
      />

      <DocumentChecklistSection
        title={`${CREATE_PROPERTY_DOCUMENT_GROUP_LABELS.landlord} (Optional)`}
        description="Property management agreement. If you uploaded this on the Landlord step, it will show here as uploaded."
        addLabel="Add document"
        fixedSlots={documentSlotsForGroup('landlord')}
        extraDocuments={management.extraDocuments}
        uploads={management.uploads}
        onChangeExtras={(extraDocuments) => onChangeManagement({ extraDocuments })}
        onChangeUploads={(uploads) => onChangeManagement({ uploads })}
        onUploadFile={onUploadManagementFile}
        onPreviewFile={onPreviewFile}
        onRemoveFile={onRemoveFile}
        disabled={disabled}
        extraIdPrefix="extra-landlord-"
        stagingOnly={stagingOnly}
      />

      <DocumentChecklistSection
        title={`${CREATE_PROPERTY_DOCUMENT_GROUP_LABELS.tenant_application} (Optional)`}
        description="Application form, ID, payslips, and supporting tenant application documents."
        addLabel="Add document"
        fixedSlots={documentSlotsForGroup('tenant_application')}
        extraDocuments={values.extraDocuments}
        uploads={values.uploads}
        onChangeExtras={(extraDocuments) => onChange({ extraDocuments })}
        onChangeUploads={(uploads) => onChange({ uploads })}
        onUploadFile={onUploadFile}
        onPreviewFile={onPreviewFile}
        onRemoveFile={onRemoveFile}
        disabled={disabled}
        extraIdPrefix="extra-tenant-"
        stagingOnly={stagingOnly}
      />
    </div>
  );
}
