'use client';

import { useRef, useState } from 'react';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChecklistUploadState } from '@/components/agent/document-checklist-upload';
import {
  StagedDocumentUploadRow,
  type StagedUploadFile,
} from '@/components/agent/staged-document-upload-row';
import {
  MANAGEMENT_AGREEMENT_DOC_SLOT,
} from '@/lib/property-document-slots';
import {
  filterUploadableFiles,
  MAX_UPLOAD_LABEL,
} from '@/lib/file-upload';
import { cn } from '@/lib/utils';
import {
  CrossubPlatformFeeSummaryRow,
  CrossubServiceFeeNotice,
  CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT,
} from '@/components/agent/crossub-service-fee-notice';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

export { MANAGEMENT_AGREEMENT_DOC_SLOT };

/** Landlord step — management agreement upload only. */
export const LANDLORD_DOC_SLOTS = [MANAGEMENT_AGREEMENT_DOC_SLOT] as const;

/** @deprecated Use LANDLORD_DOC_SLOTS */
export const MANAGEMENT_DOC_SLOTS = LANDLORD_DOC_SLOTS;

export type ManagementRateGst = '' | 'include' | 'exclude';

export interface ExtraManagementDocumentRow {
  id: string;
  docType: string;
  title: string;
}

/** Fee types agents can pick when adding a management fee row. */
export const MANAGEMENT_FEE_OPTIONS = [
  { id: 'management_fee', label: 'Management Fee', unit: 'percent' as const },
  { id: 'letting_fee', label: 'Letting Fee', unit: 'weeks' as const },
  { id: 'advertising_fee', label: 'Advertising Fee', unit: 'currency' as const },
  { id: 'lease_renewal_fee', label: 'Lease Renewal Fee', unit: 'currency' as const },
  { id: 'administration_fee', label: 'Administration Fee', unit: 'percent' as const },
  { id: 'additional_services_fees', label: 'Additional Services Fees', unit: 'currency' as const },
  {
    id: 'statements_annual_reports',
    label: 'Statements and Annual Reports',
    unit: 'currency' as const,
  },
  {
    id: 'monthly_statements_reports',
    label: 'Monthly Statements / Reports',
    unit: 'currency' as const,
  },
  {
    id: 'tenancy_agreement_preparation_fee',
    label: 'Tenancy Agreement Preparation Fee',
    unit: 'percent' as const,
  },
  {
    id: 'determination_review_of_rent',
    label: 'Determination/Review of Rent',
    unit: 'currency' as const,
  },
  {
    id: 'routine_inspection',
    label: 'Routine Inspection (3 times / yr)',
    unit: 'currency' as const,
  },
  {
    id: 'inspection_ingoing_outgoing',
    label: 'Inspection Ingoing/ outgoing',
    unit: 'currency' as const,
  },
  {
    id: 'overseeing_maintenance_repairs',
    label: 'Overseeing Maintenance and Repairs',
    unit: 'currency' as const,
  },
  {
    id: 'attend_court_tribunal',
    label: 'Attend Court or Tribunal',
    unit: 'currency' as const,
  },
  {
    id: 'attending_insurance_claims',
    label: 'Attending to Insurance claims',
    unit: 'currency' as const,
  },
] as const;

export type ManagementFeeOptionId = (typeof MANAGEMENT_FEE_OPTIONS)[number]['id'];

export type ManagementFeeValueMode = 'rate' | 'amount';

export interface ManagementFeeRow {
  id: string;
  /** Known option id or a custom fee name entered by the user. */
  feeType: string;
  valueMode: ManagementFeeValueMode;
  amount: string;
  gst: ManagementRateGst;
}

export interface ManagementDetailsValues {
  landlordInsuranceExpiry: string;
  /** @deprecated prefer fees — kept for API mapping helpers */
  administrationFee: string;
  documentationFee: string;
  lettingFee: string;
  managementRatePercent: string;
  managementRateGst: ManagementRateGst;
  fees: ManagementFeeRow[];
  uploads: ChecklistUploadState;
  extraDocuments: ExtraManagementDocumentRow[];
}

export const EMPTY_MANAGEMENT_DETAILS: ManagementDetailsValues = {
  landlordInsuranceExpiry: '',
  administrationFee: '',
  documentationFee: '',
  lettingFee: '',
  managementRatePercent: '',
  managementRateGst: '',
  fees: [
    { id: 'fee-management', feeType: 'management_fee', valueMode: 'rate', amount: '4', gst: 'include' },
    { id: 'fee-letting', feeType: 'letting_fee', valueMode: 'amount', amount: '', gst: '' },
    { id: 'fee-admin', feeType: 'administration_fee', valueMode: 'rate', amount: '', gst: '' },
  ],
  uploads: {},
  extraDocuments: [],
};

const GST_OPTIONS: { value: ManagementRateGst; label: string }[] = [
  { value: '', label: 'Select GST' },
  { value: 'include', label: 'Include GST' },
  { value: 'exclude', label: 'Exclude GST' },
];

const VALUE_MODE_OPTIONS: { value: ManagementFeeValueMode; label: string }[] = [
  { value: 'rate', label: '%' },
  { value: 'amount', label: '$' },
];

function defaultValueModeForFeeType(feeType: string): ManagementFeeValueMode {
  const option = feeOption(feeType);
  if (option?.unit === 'percent') return 'rate';
  // Letting fee / week-based fees use amount mode; percent fees use rate.
  return 'amount';
}

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

function feeOption(feeType: string) {
  return MANAGEMENT_FEE_OPTIONS.find((o) => o.id === feeType);
}

/** Pull known fee rows into the legacy scalar fields used by create-property API. */
export function syncManagementFeesToScalars(
  values: ManagementDetailsValues,
): Pick<
  ManagementDetailsValues,
  | 'administrationFee'
  | 'documentationFee'
  | 'lettingFee'
  | 'managementRatePercent'
  | 'managementRateGst'
> {
  const amountFor = (feeType: ManagementFeeOptionId) =>
    values.fees.find((f) => f.feeType === feeType)?.amount.trim() ?? '';

  const managementFee = values.fees.find((f) => f.feeType === 'management_fee');

  return {
    managementRatePercent: amountFor('management_fee') || values.managementRatePercent,
    lettingFee: amountFor('letting_fee') || values.lettingFee,
    administrationFee: amountFor('administration_fee') || values.administrationFee,
    documentationFee:
      amountFor('tenancy_agreement_preparation_fee') || values.documentationFee,
    managementRateGst:
      managementFee?.gst === 'include' || managementFee?.gst === 'exclude'
        ? managementFee.gst
        : values.managementRateGst,
  };
}

export function PropertyManagementFeesSection({
  values,
  onChange,
  disabled,
  weeklyRentAud,
}: {
  values: ManagementDetailsValues;
  onChange: (patch: Partial<ManagementDetailsValues>) => void;
  disabled?: boolean;
  /** Weekly rent for CROSSUB fee example (defaults to $500). */
  weeklyRentAud?: number | null;
}) {
  const managementFeeRow = values.fees.find((row) => row.feeType === 'management_fee');
  const managementRateRaw = managementFeeRow?.amount || values.managementRatePercent;
  const managementRateGst =
    managementFeeRow?.gst === 'include' || managementFeeRow?.gst === 'exclude'
      ? managementFeeRow.gst
      : values.managementRateGst;
  const updateFee = (id: string, patch: Partial<ManagementFeeRow>) => {
    onChange({
      fees: values.fees.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  const addFee = () => {
    const used = new Set(values.fees.map((f) => f.feeType).filter(Boolean));
    const nextType =
      MANAGEMENT_FEE_OPTIONS.find((o) => !used.has(o.id))?.id ??
      MANAGEMENT_FEE_OPTIONS[0].id;
    onChange({
      fees: [
        ...values.fees,
        {
          id: `fee-${Date.now()}`,
          feeType: nextType,
          valueMode: defaultValueModeForFeeType(nextType),
          amount: '',
          gst: '',
        },
      ],
    });
  };

  const removeFee = (id: string) => {
    onChange({ fees: values.fees.filter((row) => row.id !== id) });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Fees</p>
            <CrossubServiceFeeNotice
              forceShow
              compact
              managementRatePercent={
                managementRateRaw.trim()
                  ? Number(managementRateRaw.replace(/,/g, ''))
                  : null
              }
              managementRateGst={managementRateGst}
              weeklyRentAud={weeklyRentAud}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/10 -mt-1 h-8 shrink-0 px-2 text-xs font-medium"
            disabled={disabled}
            onClick={addFee}
          >
            <Plus className="size-3.5" />
            Add fee
          </Button>
        </div>

        {values.fees.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
            No fees yet. Tap Add fee to include one from the management agreement.
          </p>
        ) : (
          <div className="space-y-2">
            {values.fees.map((row) => {
              const option = feeOption(row.feeType);
              const isLettingFee = row.feeType === 'letting_fee' || option?.unit === 'weeks';
              const isRate = !isLettingFee && row.valueMode === 'rate';
              const amountLabel = isLettingFee ? 'Week' : isRate ? 'Rate (%)' : 'Amount ($)';
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-primary/15 bg-primary/[0.02] p-3 sm:grid-cols-2 sm:items-end lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]"
                >
                  <FormField label="Fee type">
                    <select
                      value={row.feeType}
                      onChange={(e) => {
                        const feeType = e.target.value;
                        updateFee(row.id, {
                          feeType,
                          valueMode: defaultValueModeForFeeType(feeType),
                        });
                      }}
                      className={selectClass}
                      disabled={disabled}
                    >
                      <option value="">Select fee</option>
                      {MANAGEMENT_FEE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={amountLabel}>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={isRate ? 100 : undefined}
                        step={isRate || isLettingFee ? 0.1 : 0.01}
                        value={row.amount}
                        onChange={(e) => updateFee(row.id, { amount: e.target.value })}
                        placeholder={
                          row.feeType === 'management_fee'
                            ? String(CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT)
                            : isRate
                              ? 'e.g. 5.5'
                              : isLettingFee
                                ? 'e.g. 1'
                                : '0.00'
                        }
                        disabled={disabled}
                        className="min-w-0 flex-1"
                      />
                      {isLettingFee ? (
                        <span
                          className={cn(
                            selectClass,
                            'flex w-[4.25rem] shrink-0 items-center justify-center px-2 text-center text-xs',
                          )}
                        >
                          week
                        </span>
                      ) : option?.unit === 'percent' ? (
                        <span
                          className={cn(
                            selectClass,
                            'flex w-[4.25rem] shrink-0 items-center justify-center px-2 text-center text-xs',
                          )}
                        >
                          %
                        </span>
                      ) : (
                        <select
                          value={row.valueMode}
                          onChange={(e) =>
                            updateFee(row.id, {
                              valueMode: e.target.value as ManagementFeeValueMode,
                            })
                          }
                          className={cn(selectClass, 'w-[4.25rem] shrink-0 px-2 text-center')}
                          disabled={disabled}
                          aria-label="Rate or amount unit"
                        >
                          {VALUE_MODE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </FormField>
                  <FormField label="GST">
                    <select
                      value={row.gst}
                      onChange={(e) =>
                        updateFee(row.id, { gst: e.target.value as ManagementRateGst })
                      }
                      className={selectClass}
                      disabled={disabled}
                    >
                      {GST_OPTIONS.map((opt) => (
                        <option key={opt.value || 'empty'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive size-9 shrink-0 sm:col-span-2 lg:col-span-1 lg:justify-self-end"
                    disabled={disabled}
                    onClick={() => removeFee(row.id)}
                    aria-label="Remove fee"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
            <CrossubPlatformFeeSummaryRow
              managementRatePercent={
                managementRateRaw.trim()
                  ? Number(managementRateRaw.replace(/,/g, ''))
                  : null
              }
              managementRateGst={managementRateGst}
              weeklyRentAud={weeklyRentAud}
            />
          </div>
        )}
      </div>
      <CrossubServiceFeeNotice
        forceShow
        managementRatePercent={
          managementRateRaw.trim() ? Number(managementRateRaw.replace(/,/g, '')) : null
        }
        managementRateGst={managementRateGst}
        weeklyRentAud={weeklyRentAud}
      />
    </div>
  );
}

/** @deprecated Use PropertyManagementFeesSection — insurance expiry removed from create property. */
export function PropertyManagementInsuranceAndFeesSection({
  values,
  onChange,
  disabled,
}: {
  values: ManagementDetailsValues;
  onChange: (patch: Partial<ManagementDetailsValues>) => void;
  disabled?: boolean;
}) {
  return (
    <PropertyManagementFeesSection values={values} onChange={onChange} disabled={disabled} />
  );
}

function AgreementUploadRow({
  label,
  files,
  disabled,
  uploading,
  onUpload,
  onPreview,
  onRemove,
}: {
  label: string;
  files: StagedUploadFile[];
  disabled?: boolean;
  uploading?: boolean;
  onUpload: () => void;
  onPreview?: (file: StagedUploadFile) => void;
  onRemove?: (file: StagedUploadFile) => void;
}) {
  return (
    <StagedDocumentUploadRow
      label={label}
      files={files}
      disabled={disabled}
      uploading={uploading}
      onUpload={onUpload}
      onPreview={onPreview}
      onRemove={onRemove}
      className="w-full max-w-sm"
    />
  );
}

/** Landlord step — upload the signed property management agreement only. */
export function PropertyManagementAgreementSection({
  values,
  onUploadFile,
  onPreviewFile,
  onRemoveFile,
  disabled,
  stagingOnly,
}: {
  values: ManagementDetailsValues;
  onUploadFile: (file: File, slotId: string, title?: string) => Promise<void>;
  onPreviewFile?: (file: StagedUploadFile) => void;
  onRemoveFile?: (file: StagedUploadFile, slotId: string) => void;
  disabled?: boolean;
  stagingOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const slotId = MANAGEMENT_AGREEMENT_DOC_SLOT.id;
  const files = values.uploads[slotId] ?? [];

  const onFile = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
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
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (!stagingOnly) setUploading(true);
    try {
      await Promise.all(
        ok.map((file) => onUploadFile(file, slotId, MANAGEMENT_AGREEMENT_DOC_SLOT.label)),
      );
      toast.success(
        stagingOnly
          ? ok.length === 1
            ? `Added ${ok[0]!.name}`
            : `Added ${ok.length} files`
          : ok.length === 1
            ? `Uploaded ${ok[0]!.name}`
            : `Uploaded ${ok.length} files`,
      );
    } catch {
      toast.error(stagingOnly ? 'Could not add file' : 'Upload failed');
    } finally {
      if (!stagingOnly) setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeUpload = (file: StagedUploadFile) => {
    onRemoveFile?.(file, slotId);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Management details</p>
        <p className="text-muted-foreground text-xs">
          {stagingOnly
            ? `Add the property management agreement — files upload on the Documents tab after you complete the property (up to ${MAX_UPLOAD_LABEL} per file).`
            : 'Upload the property management agreement for this landlord.'}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => void onFile(e.target.files)}
      />

      <AgreementUploadRow
        label={MANAGEMENT_AGREEMENT_DOC_SLOT.label}
        files={files}
        disabled={disabled}
        uploading={uploading}
        onUpload={() => inputRef.current?.click()}
        onPreview={onPreviewFile}
        onRemove={removeUpload}
      />
    </div>
  );
}

/** @deprecated Use PropertyManagementInsuranceAndFeesSection or PropertyManagementAgreementSection. */
export function PropertyManagementDetailsSection({
  values,
  onChange,
  disabled,
}: {
  values: ManagementDetailsValues;
  onChange: (patch: Partial<ManagementDetailsValues>) => void;
  disabled?: boolean;
}) {
  return (
    <PropertyManagementInsuranceAndFeesSection
      values={values}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
