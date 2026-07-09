'use client';

import { Plus, Trash2 } from 'lucide-react';

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

export interface ExtraManagementDocumentRow {
  id: string;
  docType: string;
  title: string;
}

/** Fee types agents can pick when adding a management fee row. */
export const MANAGEMENT_FEE_OPTIONS = [
  { id: 'management_fee', label: 'Management Fee', unit: 'percent' as const },
  { id: 'letting_fee', label: 'Letting Fee', unit: 'currency' as const },
  { id: 'lease_renewal_fee', label: 'Lease Renewal Fee', unit: 'currency' as const },
  { id: 'administration_fee', label: 'Administration Fee', unit: 'currency' as const },
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
    unit: 'currency' as const,
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

export interface ManagementFeeRow {
  id: string;
  feeType: ManagementFeeOptionId | '';
  amount: string;
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
    { id: 'fee-management', feeType: 'management_fee', amount: '' },
    { id: 'fee-letting', feeType: 'letting_fee', amount: '' },
    { id: 'fee-admin', feeType: 'administration_fee', amount: '' },
  ],
  uploads: {},
  extraDocuments: [],
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

function feeOption(feeType: string) {
  return MANAGEMENT_FEE_OPTIONS.find((o) => o.id === feeType);
}

/** Pull known fee rows into the legacy scalar fields used by create-property API. */
export function syncManagementFeesToScalars(
  values: ManagementDetailsValues,
): Pick<
  ManagementDetailsValues,
  'administrationFee' | 'documentationFee' | 'lettingFee' | 'managementRatePercent'
> {
  const amountFor = (feeType: ManagementFeeOptionId) =>
    values.fees.find((f) => f.feeType === feeType)?.amount.trim() ?? '';

  return {
    managementRatePercent: amountFor('management_fee') || values.managementRatePercent,
    lettingFee: amountFor('letting_fee') || values.lettingFee,
    administrationFee: amountFor('administration_fee') || values.administrationFee,
    documentationFee:
      amountFor('tenancy_agreement_preparation_fee') || values.documentationFee,
  };
}

export function PropertyManagementDetailsSection({
  values,
  onChange,
  disabled,
}: {
  values: ManagementDetailsValues;
  onChange: (patch: Partial<ManagementDetailsValues>) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof ManagementDetailsValues>(key: K, value: ManagementDetailsValues[K]) =>
    onChange({ [key]: value });

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
        { id: `fee-${Date.now()}`, feeType: nextType, amount: '' },
      ],
    });
  };

  const removeFee = (id: string) => {
    onChange({ fees: values.fees.filter((row) => row.id !== id) });
  };

  const hasManagementFee = values.fees.some((f) => f.feeType === 'management_fee');

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Management details</p>
        <p className="text-muted-foreground text-xs">
          Insurance expiry and fee schedule for this property.
        </p>
      </div>

      <FormField label="Landlord insurance expiry date">
        <Input
          type="date"
          value={values.landlordInsuranceExpiry}
          onChange={(e) => set('landlordInsuranceExpiry', e.target.value)}
          disabled={disabled}
        />
      </FormField>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Fees</p>
            <p className="text-muted-foreground text-xs">
              Add management agreement fees. Management Fee is entered as a percentage.
            </p>
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
              const isPercent = option?.unit === 'percent';
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-primary/15 bg-primary/[0.02] p-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_auto] sm:items-end"
                >
                  <FormField label="Fee type">
                    <select
                      value={row.feeType}
                      onChange={(e) =>
                        updateFee(row.id, {
                          feeType: e.target.value as ManagementFeeOptionId | '',
                        })
                      }
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
                  <FormField label={isPercent ? 'Rate (%)' : 'Amount ($)'}>
                    <Input
                      type="number"
                      min={0}
                      max={isPercent ? 100 : undefined}
                      step={isPercent ? 0.1 : 0.01}
                      value={row.amount}
                      onChange={(e) => updateFee(row.id, { amount: e.target.value })}
                      placeholder={isPercent ? 'e.g. 5.5' : '0.00'}
                      disabled={disabled}
                    />
                  </FormField>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive size-9 shrink-0"
                    disabled={disabled}
                    onClick={() => removeFee(row.id)}
                    aria-label="Remove fee"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {hasManagementFee ? (
          <FormField label="Management fee GST">
            <select
              value={values.managementRateGst}
              onChange={(e) => set('managementRateGst', e.target.value as ManagementRateGst)}
              className={cn(selectClass, 'max-w-xs')}
              disabled={disabled}
            >
              {GST_OPTIONS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </div>
    </div>
  );
}
