'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { fetchProperty } from '@/lib/crossub-api/agent-client';
import {
  createAgentTribunalRentChasing,
  type CreateAgentTribunalRentChasingInput,
} from '@/lib/crossub-api/agent-workflow-client';
import { fetchPropertyRentPaidUntil } from '@/lib/property-form-prefill';
import { propertyRegistryApi } from '@/lib/property-registry-api';
import {
  amountFromWeekly,
  RENT_PERIOD_OPTIONS,
  type RentPeriodChoice,
} from '@/lib/rent-calculations';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';

const BILL_TYPE_PRESETS = [
  'Water',
  'Council',
  'Electricity',
  'Gas',
  'Strata',
  'Other',
] as const;

type BillRow = {
  id: string;
  billType: string;
  billName: string;
  dueDate: string;
  amount: string;
  customType: boolean;
};

function newBillRow(partial?: Partial<BillRow>): BillRow {
  return {
    id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    billType: '',
    billName: '',
    dueDate: '',
    amount: '',
    customType: false,
    ...partial,
  };
}

const selectClass =
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
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
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function parseDraftBills(draft: Record<string, unknown> | null | undefined): BillRow[] {
  const raw = draft?.accountingBills;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const row = entry as Record<string, unknown>;
      const billType = typeof row.billType === 'string' ? row.billType.trim() : '';
      const billName = typeof row.billName === 'string' ? row.billName.trim() : billType;
      if (!billType && !billName) return null;
      const preset = BILL_TYPE_PRESETS.includes(billType as (typeof BILL_TYPE_PRESETS)[number]);
      return newBillRow({
        billType: preset ? billType : billType || 'Other',
        billName: billName || billType,
        dueDate: typeof row.dueDate === 'string' ? row.dueDate.slice(0, 10) : '',
        amount: row.amount != null && Number.isFinite(Number(row.amount)) ? String(row.amount) : '',
        customType: !preset,
      });
    })
    .filter((row): row is BillRow => row != null);
}

export function CreateTribunalRentChasingDialog({
  open,
  onOpenChange,
  propertyId: initialPropertyId,
  properties,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, property is locked (opened from a property hub). */
  propertyId?: string | null;
  properties: Property[];
  onCreated?: (caseId: string) => void;
}) {
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rentAmount, setRentAmount] = useState('');
  const [paymentCycle, setPaymentCycle] = useState<RentPeriodChoice>('weekly');
  const [rentPaidTo, setRentPaidTo] = useState('');
  const [bills, setBills] = useState<BillRow[]>([]);
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [bondAmount, setBondAmount] = useState('');
  const [bondNotes, setBondNotes] = useState('');

  const propertyOptions = useMemo(
    () =>
      [...properties].sort((a, b) =>
        a.address.localeCompare(b.address, undefined, { sensitivity: 'base' }),
      ),
    [properties],
  );

  useEffect(() => {
    if (!open) return;
    setPropertyId(initialPropertyId ?? '');
  }, [open, initialPropertyId]);

  useEffect(() => {
    if (!open || !propertyId) {
      if (open && !propertyId) {
        setRentAmount('');
        setPaymentCycle('weekly');
        setRentPaidTo('');
        setBills([]);
        setLeaseStartDate('');
        setBondAmount('');
        setBondNotes('');
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [agentProperty, record, paidTo] = await Promise.all([
          fetchProperty(propertyId).catch(() => null),
          propertyRegistryApi.get(propertyId).catch(() => null),
          fetchPropertyRentPaidUntil(propertyId),
        ]);

        if (cancelled) return;

        const draft =
          agentProperty?.registryDraft != null &&
          typeof agentProperty.registryDraft === 'object' &&
          !Array.isArray(agentProperty.registryDraft)
            ? (agentProperty.registryDraft as Record<string, unknown>)
            : null;

        const cycleRaw =
          typeof draft?.rentPeriod === 'string' ? draft.rentPeriod.trim().toLowerCase() : '';
        const cycle: RentPeriodChoice =
          cycleRaw === 'fortnightly' || cycleRaw === 'monthly' || cycleRaw === 'weekly'
            ? cycleRaw
            : 'weekly';

        const weekly =
          agentProperty?.rentWeekly ??
          record?.rentWeekly ??
          properties.find((p) => p.id === propertyId)?.rentWeekly ??
          null;

        setPaymentCycle(cycle);
        setRentAmount(
          weekly != null && weekly > 0 ? String(amountFromWeekly(weekly, cycle)) : '',
        );
        setRentPaidTo(paidTo ?? '');
        setLeaseStartDate(
          (agentProperty?.leaseStart ?? record?.leaseStartDate ?? '').toString().slice(0, 10),
        );
        const bond =
          agentProperty?.bondAmount ??
          record?.bondAmount ??
          properties.find((p) => p.id === propertyId)?.bondAmount ??
          null;
        setBondAmount(bond != null && bond > 0 ? String(bond) : '');
        setBondNotes('');
        setBills(parseDraftBills(draft));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, propertyId, properties]);

  const lockedProperty = Boolean(initialPropertyId);

  const submit = async () => {
    if (!propertyId) {
      toast.error('Select a property');
      return;
    }

    const rentValue = rentAmount.trim() ? Number(rentAmount) : undefined;
    const bondValue = bondAmount.trim() ? Number(bondAmount) : undefined;
    const billRows = bills
      .map((row) => {
        const billType = (row.customType ? row.billName || row.billType : row.billType).trim();
        const billName = (row.billName || billType).trim();
        const amount = row.amount.trim() ? Number(row.amount) : undefined;
        if (!billType && amount == null && !row.dueDate) return null;
        return {
          billType: billType || billName || 'Other',
          billName: billName || billType || 'Other',
          dueDate: row.dueDate || undefined,
          amount: Number.isFinite(amount) ? amount : undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const hasRent =
      (rentValue != null && Number.isFinite(rentValue)) || Boolean(rentPaidTo.trim());
    const hasBills = billRows.length > 0;
    const hasBond =
      (bondValue != null && Number.isFinite(bondValue)) ||
      Boolean(leaseStartDate.trim()) ||
      Boolean(bondNotes.trim());

    if (!hasRent && !hasBills && !hasBond) {
      toast.error('Fill in at least one of Rent Arrears, Bill Arrears, or Bond Arrears');
      return;
    }

    if (rentValue != null && (!Number.isFinite(rentValue) || rentValue < 0)) {
      toast.error('Enter a valid rent amount');
      return;
    }
    if (bondValue != null && (!Number.isFinite(bondValue) || bondValue < 0)) {
      toast.error('Enter a valid bond amount');
      return;
    }
    if (!paymentCycle && rentValue != null) {
      toast.error('Select a payment cycle');
      return;
    }

    const body: CreateAgentTribunalRentChasingInput = {};
    if (hasRent) {
      body.rentArrears = {
        rentAmount: rentValue,
        paymentCycle: paymentCycle || undefined,
        rentPaidTo: rentPaidTo.trim() || undefined,
      };
    }
    if (hasBills) body.billArrears = billRows;
    if (hasBond) {
      body.bondArrears = {
        leaseStartDate: leaseStartDate.trim() || undefined,
        bondAmount: bondValue,
        notes: bondNotes.trim() || undefined,
      };
    }

    setSaving(true);
    try {
      const result = await createAgentTribunalRentChasing(propertyId, body);
      toast.success('Rent Chasing case created');
      onOpenChange(false);
      onCreated?.(result.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create tribunal case');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-4 py-3 text-left">
          <DialogTitle>Rent Chasing</DialogTitle>
          <DialogDescription>
            Create a tribunal case for rent, bill, and bond arrears. Profile fields update when you
            save.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <Field label="Property">
            {lockedProperty ? (
              <p className="text-sm font-medium">
                {properties.find((p) => p.id === propertyId)?.address ?? 'Selected property'}
              </p>
            ) : (
              <select
                className={selectClass}
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                disabled={saving}
              >
                <option value="">Select property</option>
                {propertyOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address}
                    {p.suburb ? `, ${p.suburb}` : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading property profile…
            </div>
          ) : (
            <>
              <Section
                title="Rent Arrears"
                description="Prefills from the property profile. Changes update rent paid to and weekly rent."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Rent">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={saving || !propertyId}
                    />
                  </Field>
                  <Field label="Payment cycle">
                    <select
                      className={selectClass}
                      value={paymentCycle}
                      onChange={(e) => setPaymentCycle(e.target.value as RentPeriodChoice)}
                      disabled={saving || !propertyId}
                    >
                      {RENT_PERIOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Rent paid to" className="sm:col-span-2">
                    <Input
                      type="date"
                      value={rentPaidTo}
                      onChange={(e) => setRentPaidTo(e.target.value)}
                      disabled={saving || !propertyId}
                    />
                  </Field>
                </div>
              </Section>

              <Section
                title="Bill Arrears"
                description="Add one or more unpaid bills. Types can be custom."
              >
                <div className="space-y-3">
                  {bills.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No bills added yet.</p>
                  ) : (
                    bills.map((row) => (
                      <div
                        key={row.id}
                        className="space-y-2 rounded-lg border border-dashed p-3"
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Field label="Bill type">
                            <select
                              className={selectClass}
                              value={row.customType ? '__custom__' : row.billType}
                              onChange={(e) => {
                                const value = e.target.value;
                                setBills((prev) =>
                                  prev.map((b) =>
                                    b.id === row.id
                                      ? value === '__custom__'
                                        ? { ...b, customType: true, billType: 'Other' }
                                        : {
                                            ...b,
                                            customType: false,
                                            billType: value,
                                            billName: b.billName || value,
                                          }
                                      : b,
                                  ),
                                );
                              }}
                              disabled={saving}
                            >
                              <option value="">Select type</option>
                              {BILL_TYPE_PRESETS.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                              <option value="__custom__">Add bill type…</option>
                            </select>
                          </Field>
                          <Field label="Bill name">
                            <Input
                              value={row.billName}
                              onChange={(e) =>
                                setBills((prev) =>
                                  prev.map((b) =>
                                    b.id === row.id ? { ...b, billName: e.target.value } : b,
                                  ),
                                )
                              }
                              placeholder={row.customType ? 'Custom bill name' : 'Optional label'}
                              disabled={saving}
                            />
                          </Field>
                          <Field label="Bill due date">
                            <Input
                              type="date"
                              value={row.dueDate}
                              onChange={(e) =>
                                setBills((prev) =>
                                  prev.map((b) =>
                                    b.id === row.id ? { ...b, dueDate: e.target.value } : b,
                                  ),
                                )
                              }
                              disabled={saving}
                            />
                          </Field>
                          <Field label="Amount">
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={row.amount}
                                onChange={(e) =>
                                  setBills((prev) =>
                                    prev.map((b) =>
                                      b.id === row.id ? { ...b, amount: e.target.value } : b,
                                    ),
                                  )
                                }
                                placeholder="0.00"
                                disabled={saving}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="shrink-0"
                                onClick={() =>
                                  setBills((prev) => prev.filter((b) => b.id !== row.id))
                                }
                                disabled={saving}
                                aria-label="Remove bill"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </Field>
                        </div>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setBills((prev) => [...prev, newBillRow()])}
                    disabled={saving || !propertyId}
                  >
                    <Plus className="size-3.5" />
                    Add bill
                  </Button>
                </div>
              </Section>

              <Section
                title="Bond Arrears"
                description="Lease start and bond sync to the property profile. Notes stay on the case."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Lease agreement start date">
                    <Input
                      type="date"
                      value={leaseStartDate}
                      onChange={(e) => setLeaseStartDate(e.target.value)}
                      disabled={saving || !propertyId}
                    />
                  </Field>
                  <Field label="Bond">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={bondAmount}
                      onChange={(e) => setBondAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={saving || !propertyId}
                    />
                  </Field>
                  <Field label="Notes" className="sm:col-span-2">
                    <textarea
                      value={bondNotes}
                      onChange={(e) => setBondNotes(e.target.value)}
                      rows={3}
                      disabled={saving || !propertyId}
                      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Bond claim notes…"
                    />
                  </Field>
                </div>
              </Section>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create case'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
