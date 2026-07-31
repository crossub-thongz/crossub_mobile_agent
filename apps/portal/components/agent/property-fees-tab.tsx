'use client';

import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  CrossubPlatformFeeSummaryRow,
  CrossubServiceFeeNotice,
} from '@/components/agent/crossub-service-fee-notice';
import {
  MANAGEMENT_FEE_OPTIONS,
  type ManagementFeeRow,
  type ManagementRateGst,
} from '@/components/agent/property-management-details-section';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { updateProperty, type UpdateAgentPropertyInput } from '@/lib/crossub-api/agent-client';
import {
  buildManagementFeesUpdatePayload,
  feeLabel,
  feeUnit,
  formatFeeRowDisplay,
  formatGstLabel,
  resolvePropertyManagementFees,
  valueModeForUnit,
  type ManagementFeeUnit,
} from '@/lib/management-fees';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

const GST_OPTIONS: { value: ManagementRateGst; label: string }[] = [
  { value: '', label: 'Select GST' },
  { value: 'include', label: 'Include GST' },
  { value: 'exclude', label: 'Exclude GST' },
];

const UNIT_OPTIONS: { value: ManagementFeeUnit; label: string }[] = [
  { value: 'rate', label: 'Rate (%)' },
  { value: 'week', label: 'Week' },
];

const CUSTOM_FEE_VALUE = '__custom__';

type AddFeeDraft = {
  preset: string;
  customName: string;
  amount: string;
  unit: ManagementFeeUnit;
  gst: ManagementRateGst;
};

const EMPTY_ADD_DRAFT: AddFeeDraft = {
  preset: '',
  customName: '',
  amount: '',
  unit: 'rate',
  gst: '',
};

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

function isKnownFeeType(feeType: string): boolean {
  return MANAGEMENT_FEE_OPTIONS.some((o) => o.id === feeType);
}

function resolveFeeTypeFromDraft(draft: AddFeeDraft): string {
  if (draft.preset === CUSTOM_FEE_VALUE || !draft.preset) {
    return draft.customName.trim();
  }
  return draft.preset;
}

function FeeTypeField({
  row,
  saving,
  onUpdate,
}: {
  row: ManagementFeeRow;
  saving: boolean;
  onUpdate: (patch: Partial<ManagementFeeRow>) => void;
}) {
  const known = isKnownFeeType(row.feeType);

  return (
    <div className="space-y-1.5">
      <select
        value={known ? row.feeType : CUSTOM_FEE_VALUE}
        onChange={(e) => {
          const value = e.target.value;
          if (value === CUSTOM_FEE_VALUE) {
            onUpdate({
              feeType: known ? '' : row.feeType,
            });
            return;
          }
          onUpdate({
            feeType: value,
            valueMode: valueModeForUnit(
              MANAGEMENT_FEE_OPTIONS.find((o) => o.id === value)?.unit === 'percent'
                ? 'rate'
                : 'week',
            ),
          });
        }}
        className={selectClass}
        disabled={saving}
      >
        <option value="">Select fee</option>
        {MANAGEMENT_FEE_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
        <option value={CUSTOM_FEE_VALUE}>Custom…</option>
      </select>
      {!known ? (
        <Input
          value={row.feeType}
          onChange={(e) => onUpdate({ feeType: e.target.value })}
          placeholder="Enter fee name"
          disabled={saving}
        />
      ) : null}
    </div>
  );
}

function FeeRateField({
  row,
  saving,
  onUpdate,
}: {
  row: ManagementFeeRow;
  saving: boolean;
  onUpdate: (patch: Partial<ManagementFeeRow>) => void;
}) {
  const unit = feeUnit(row);

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min={0}
        max={unit === 'rate' ? 100 : undefined}
        step={0.1}
        value={row.amount}
        onChange={(e) => onUpdate({ amount: e.target.value })}
        className="min-w-0 flex-1"
        disabled={saving}
      />
      <select
        value={unit}
        onChange={(e) =>
          onUpdate({
            valueMode: valueModeForUnit(e.target.value as ManagementFeeUnit),
          })
        }
        className={cn(selectClass, 'w-[7.5rem] shrink-0')}
        disabled={saving}
      >
        {UNIT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FeeGstField({
  row,
  saving,
  onUpdate,
}: {
  row: ManagementFeeRow;
  saving: boolean;
  onUpdate: (patch: Partial<ManagementFeeRow>) => void;
}) {
  return (
    <select
      value={row.gst}
      onChange={(e) =>
        onUpdate({
          gst: e.target.value as ManagementRateGst,
        })
      }
      className={selectClass}
      disabled={saving}
    >
      {GST_OPTIONS.map((opt) => (
        <option key={opt.value || 'none'} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function FeeRowMobileCard({
  row,
  editing,
  saving,
  onUpdate,
  onRemove,
}: {
  row: ManagementFeeRow;
  editing: boolean;
  saving: boolean;
  onUpdate: (patch: Partial<ManagementFeeRow>) => void;
  onRemove: () => void;
}) {
  if (!editing) {
    return (
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <p className="text-sm font-semibold">{feeLabel(row.feeType)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="font-medium tabular-nums">{formatFeeRowDisplay(row)}</span>
          <span className="text-muted-foreground">{formatGstLabel(row.gst)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
      <FormField label="Fee type">
        <FeeTypeField row={row} saving={saving} onUpdate={onUpdate} />
      </FormField>
      <FormField label="Rate">
        <FeeRateField row={row} saving={saving} onUpdate={onUpdate} />
      </FormField>
      <FormField label="GST">
        <FeeGstField row={row} saving={saving} onUpdate={onUpdate} />
      </FormField>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10"
          disabled={saving}
          onClick={onRemove}
          aria-label="Delete fee"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function PropertyFeesTab({
  property,
  propertyId,
}: {
  property: Property;
  propertyId: string;
}) {
  const { apiConnected, refresh } = useAgentData();
  const [fees, setFees] = useState<ManagementFeeRow[]>(() =>
    resolvePropertyManagementFees(property),
  );
  const [editing, setEditing] = useState(false);
  const [draftFees, setDraftFees] = useState<ManagementFeeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<AddFeeDraft>(EMPTY_ADD_DRAFT);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const next = resolvePropertyManagementFees(property);
    setFees(next);
    if (!editing) setDraftFees(next);
  }, [property, editing]);

  const displayFees = editing ? draftFees : fees;

  const managementFeeRow = displayFees.find((row) => row.feeType === 'management_fee');
  const managementRatePercent =
    managementFeeRow?.amount.trim() ?
      Number(managementFeeRow.amount.replace(/,/g, ''))
    : property.managementRatePercent ?? null;

  const startEdit = () => {
    setDraftFees(fees.map((row) => ({ ...row })));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraftFees(fees.map((row) => ({ ...row })));
    setEditing(false);
  };

  const updateDraftFee = (id: string, patch: Partial<ManagementFeeRow>) => {
    setDraftFees((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeDraftFee = (id: string) => {
    setDraftFees((prev) => prev.filter((row) => row.id !== id));
  };

  const persistFees = async (nextFees: ManagementFeeRow[], successMessage: string) => {
    if (!apiConnected) {
      toast.error('Connect to the API to save fees');
      return false;
    }
    setSaving(true);
    try {
      await updateProperty(
        propertyId,
        buildManagementFeesUpdatePayload(nextFees) as UpdateAgentPropertyInput,
      );
      await refresh();
      setFees(nextFees);
      toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save fees');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveEdits = async () => {
    const ok = await persistFees(draftFees, 'Fees updated');
    if (ok) setEditing(false);
  };

  const openAddDialog = () => {
    setAddDraft(EMPTY_ADD_DRAFT);
    setAddOpen(true);
  };

  const submitAddFee = async () => {
    const feeType = resolveFeeTypeFromDraft(addDraft);
    if (!feeType) {
      toast.error('Select a fee type or enter a custom name');
      return;
    }
    if (!addDraft.amount.trim()) {
      toast.error('Enter a rate or weeks value');
      return;
    }
    const nextRow: ManagementFeeRow = {
      id: `fee-${Date.now()}`,
      feeType,
      valueMode: valueModeForUnit(addDraft.unit),
      amount: addDraft.amount.trim(),
      gst: addDraft.gst,
    };
    const nextFees = [...fees, nextRow];
    setAdding(true);
    try {
      const ok = await persistFees(nextFees, 'Fee added');
      if (ok) {
        setAddOpen(false);
        setAddDraft(EMPTY_ADD_DRAFT);
        if (editing) setDraftFees(nextFees.map((row) => ({ ...row })));
      }
    } finally {
      setAdding(false);
    }
  };

  const showCustomName =
    addDraft.preset === CUSTOM_FEE_VALUE ||
    (addDraft.preset === '' && addDraft.customName.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h2 className="text-base font-semibold">Fees</h2>
          <CrossubServiceFeeNotice
            forceShow
            compact
            managementRatePercent={managementRatePercent}
            weeklyRentAud={property.rentWeekly}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={cancelEdit}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!apiConnected || saving}
                onClick={() => void saveEdits()}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!apiConnected || saving || fees.length === 0}
                onClick={startEdit}
              >
                <Pencil className="size-3.5" />
                Edit fees
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!apiConnected || saving}
                onClick={openAddDialog}
              >
                <Plus className="size-3.5" />
                Add fee
              </Button>
            </>
          )}
        </div>
      </div>

      {displayFees.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          No fees yet. Click Add fee to include one from the management agreement.
        </p>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {displayFees.map((row) => (
              <FeeRowMobileCard
                key={row.id}
                row={row}
                editing={editing}
                saving={saving}
                onUpdate={(patch) => updateDraftFee(row.id, patch)}
                onRemove={() => removeDraftFee(row.id)}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card md:block">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">Fee type</th>
                <th className="px-3 py-2.5 font-medium">Rate</th>
                <th className="px-3 py-2.5 font-medium">GST</th>
                {editing ? <th className="px-3 py-2.5 font-medium text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {displayFees.map((row) => (
                <tr key={row.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2.5 align-middle">
                    {editing ? (
                      <FeeTypeField
                        row={row}
                        saving={saving}
                        onUpdate={(patch) => updateDraftFee(row.id, patch)}
                      />
                    ) : (
                      <span className="font-medium">{feeLabel(row.feeType)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {editing ? (
                      <FeeRateField
                        row={row}
                        saving={saving}
                        onUpdate={(patch) => updateDraftFee(row.id, patch)}
                      />
                    ) : (
                      <span className="tabular-nums">{formatFeeRowDisplay(row)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {editing ? (
                      <FeeGstField
                        row={row}
                        saving={saving}
                        onUpdate={(patch) => updateDraftFee(row.id, patch)}
                      />
                    ) : (
                      formatGstLabel(row.gst)
                    )}
                  </td>
                  {editing ? (
                    <td className="px-3 py-2.5 text-right align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={saving}
                        onClick={() => removeDraftFee(row.id)}
                        aria-label="Delete fee"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      <CrossubPlatformFeeSummaryRow
        managementRatePercent={managementRatePercent}
        weeklyRentAud={property.rentWeekly}
      />
      <CrossubServiceFeeNotice
        forceShow
        managementRatePercent={managementRatePercent}
        weeklyRentAud={property.rentWeekly}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add fee</DialogTitle>
            <DialogDescription>
              Choose a fee type from the list or enter a custom name, then set the rate and GST.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <FormField label="Fee type">
              <select
                value={
                  addDraft.preset ||
                  (addDraft.customName ? CUSTOM_FEE_VALUE : '')
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === CUSTOM_FEE_VALUE) {
                    setAddDraft((d) => ({ ...d, preset: CUSTOM_FEE_VALUE }));
                    return;
                  }
                  const option = MANAGEMENT_FEE_OPTIONS.find((o) => o.id === value);
                  setAddDraft((d) => ({
                    ...d,
                    preset: value,
                    customName: '',
                    unit:
                      option?.unit === 'percent'
                        ? 'rate'
                        : option?.unit === 'weeks'
                          ? 'week'
                          : d.unit,
                  }));
                }}
                className={selectClass}
                disabled={adding || saving}
              >
                <option value="">Select fee</option>
                {MANAGEMENT_FEE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
                <option value={CUSTOM_FEE_VALUE}>Custom…</option>
              </select>
            </FormField>
            {showCustomName || addDraft.preset === CUSTOM_FEE_VALUE ? (
              <FormField label="Custom fee name">
                <Input
                  value={addDraft.customName}
                  onChange={(e) =>
                    setAddDraft((d) => ({
                      ...d,
                      preset: CUSTOM_FEE_VALUE,
                      customName: e.target.value,
                    }))
                  }
                  placeholder="Enter fee name"
                  disabled={adding || saving}
                />
              </FormField>
            ) : null}
            <FormField label="Rate">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={addDraft.unit === 'rate' ? 100 : undefined}
                  step={0.1}
                  value={addDraft.amount}
                  onChange={(e) => setAddDraft((d) => ({ ...d, amount: e.target.value }))}
                  placeholder={addDraft.unit === 'rate' ? 'e.g. 5.5' : 'e.g. 1'}
                  className="min-w-0 flex-1"
                  disabled={adding || saving}
                />
                <select
                  value={addDraft.unit}
                  onChange={(e) =>
                    setAddDraft((d) => ({
                      ...d,
                      unit: e.target.value as ManagementFeeUnit,
                    }))
                  }
                  className={cn(selectClass, 'w-[7.5rem] shrink-0')}
                  disabled={adding || saving}
                >
                  {UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </FormField>
            <FormField label="GST">
              <select
                value={addDraft.gst}
                onChange={(e) =>
                  setAddDraft((d) => ({
                    ...d,
                    gst: e.target.value as ManagementRateGst,
                  }))
                }
                className={selectClass}
                disabled={adding || saving}
              >
                {GST_OPTIONS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={adding || saving}
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={adding || saving}
              onClick={() => void submitAddFee()}
            >
              {adding || saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Add fee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
