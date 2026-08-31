'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import { SelectChip } from '@/components/agent/form-step';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AgentInputFeedbackAnchor } from '@/components/ui/agent-input-feedback';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bindSanitizedTextValue } from '@/lib/strip-emojis';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  createAgentPropertyArrears,
  createAgentTribunalRentChasing,
  fetchAgentTribunalRentChasingPrefill,
  type AgentTribunalRentChasingPrefill,
  type CreateAgentTribunalRentChasingInput,
} from '@/lib/crossub-api/agent-workflow-client';
import { preparePlatformCharge } from '@/lib/crossub-api/agent-billing-client';
import { getStripePublishableKey } from '@/lib/stripe-client';
import {
  RENT_PERIOD_OPTIONS,
  type RentPeriodChoice,
} from '@/lib/rent-calculations';
import type { Property } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type ArrearsKind = 'rent' | 'bill' | 'bond';

const ARREARS_KIND_OPTIONS: { id: ArrearsKind; label: string }[] = [
  { id: 'rent', label: 'Rent arrears' },
  { id: 'bill', label: 'Bill arrears' },
  { id: 'bond', label: 'Bond arrears' },
];

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

function billRowsFromPrefill(
  rows: AgentTribunalRentChasingPrefill['billArrears'],
): BillRow[] {
  return rows.map((bill) =>
    newBillRow({
      billType: bill.billType,
      billName: bill.billName ?? bill.billType,
      dueDate: bill.dueDate ?? '',
      amount: bill.amount != null ? String(bill.amount) : '',
      customType: !BILL_TYPE_PRESETS.includes(
        bill.billType as (typeof BILL_TYPE_PRESETS)[number],
      ),
    }),
  );
}

function applyKindPrefill(
  kind: ArrearsKind,
  prefill: AgentTribunalRentChasingPrefill,
  setters: {
    setRentAmount: (value: string) => void;
    setPaymentCycle: (value: RentPeriodChoice) => void;
    setRentPaidTo: (value: string) => void;
    setBills: (rows: BillRow[]) => void;
    setAgreementEndDate: (value: string) => void;
    setBondAmount: (value: string) => void;
    setBondNotes: (value: string) => void;
  },
) {
  if (kind === 'rent' && prefill.rentArrears) {
    setters.setRentAmount(
      prefill.rentArrears.rentAmount != null
        ? String(prefill.rentArrears.rentAmount)
        : '',
    );
    setters.setPaymentCycle(
      (prefill.rentArrears.paymentCycle as RentPeriodChoice) ?? 'weekly',
    );
    setters.setRentPaidTo(prefill.rentArrears.rentPaidTo ?? '');
    return;
  }

  if (kind === 'bill' && prefill.billArrears.length > 0) {
    setters.setBills(billRowsFromPrefill(prefill.billArrears));
    return;
  }

  if (kind === 'bond' && prefill.bondArrears) {
    setters.setAgreementEndDate(prefill.bondArrears.agreementEndDate ?? '');
    setters.setBondAmount(
      prefill.bondArrears.bondAmount != null ? String(prefill.bondArrears.bondAmount) : '',
    );
    setters.setBondNotes(prefill.bondArrears.notes ?? '');
  }
}

function stashPrefillFields(
  prefill: AgentTribunalRentChasingPrefill,
  setters: {
    setRentAmount: (value: string) => void;
    setPaymentCycle: (value: RentPeriodChoice) => void;
    setRentPaidTo: (value: string) => void;
    setBills: (rows: BillRow[]) => void;
    setAgreementEndDate: (value: string) => void;
    setBondAmount: (value: string) => void;
    setBondNotes: (value: string) => void;
  },
) {
  if (prefill.rentArrears) {
    applyKindPrefill('rent', prefill, setters);
  } else {
    setters.setRentAmount('');
    setters.setRentPaidTo('');
    setters.setPaymentCycle('weekly');
  }

  setters.setBills(billRowsFromPrefill(prefill.billArrears));

  if (prefill.bondArrears) {
    applyKindPrefill('bond', prefill, setters);
  } else {
    setters.setAgreementEndDate('');
    setters.setBondAmount('');
    setters.setBondNotes('');
  }
}

export function CreateTribunalRentChasingDialog({
  open,
  onOpenChange,
  propertyId: initialPropertyId,
  properties,
  mode = 'rent_chasing',
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, property is locked (opened from a property hub). */
  propertyId?: string | null;
  properties: Property[];
  /** Rent Chasing from Accounting vs Add tribunal from the Tribunal tab. */
  mode?: 'rent_chasing' | 'tribunal';
  onCreated?: (caseId: string) => void;
}) {
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rentAmount, setRentAmount] = useState('');
  const [paymentCycle, setPaymentCycle] = useState<RentPeriodChoice>('weekly');
  const [rentPaidTo, setRentPaidTo] = useState('');
  const [bills, setBills] = useState<BillRow[]>([]);
  const [agreementEndDate, setAgreementEndDate] = useState('');
  const [bondAmount, setBondAmount] = useState('');
  const [bondNotes, setBondNotes] = useState('');
  const [selectedKinds, setSelectedKinds] = useState<ArrearsKind[]>([]);
  const [prefill, setPrefill] = useState<AgentTribunalRentChasingPrefill | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const [pendingTribunalCreate, setPendingTribunalCreate] = useState<{
    body: CreateAgentTribunalRentChasingInput;
    platformChargeId: string;
  } | null>(null);

  const { accounting } = useAgentData();
  const propertyIdsWithArrears = useMemo(
    () =>
      new Set(
        accounting.filter((row) => row.arrearsAmount > 0).map((row) => row.propertyId),
      ),
    [accounting],
  );

  const isAddingArrears = mode === 'rent_chasing';

  const propertyOptions = useMemo(
    () =>
      [...properties]
        .filter((property) =>
          initialPropertyId
            ? property.id === initialPropertyId
            : isAddingArrears
              ? propertyIdsWithArrears.has(property.id)
              : true,
        )
        .sort((a, b) =>
          a.address.localeCompare(b.address, undefined, { sensitivity: 'base' }),
        ),
    [initialPropertyId, properties, propertyIdsWithArrears, isAddingArrears],
  );

  const selectableKinds = useMemo(
    () => ARREARS_KIND_OPTIONS.map((option) => option.id),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setPropertyId(initialPropertyId ?? '');
    setSelectedKinds([]);
    setPrefill(null);
  }, [open, initialPropertyId]);

  useEffect(() => {
    if (!open || !propertyId) {
      if (open && !propertyId) {
        setRentAmount('');
        setPaymentCycle('weekly');
        setRentPaidTo('');
        setBills([]);
        setAgreementEndDate('');
        setBondAmount('');
        setBondNotes('');
        setPrefill(null);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const nextPrefill = await fetchAgentTribunalRentChasingPrefill(propertyId);
        if (cancelled) return;
        setPrefill(nextPrefill);
        stashPrefillFields(nextPrefill, {
          setRentAmount,
          setPaymentCycle,
          setRentPaidTo,
          setBills,
          setAgreementEndDate,
          setBondAmount,
          setBondNotes,
        });
        setSelectedKinds([]);
      } catch (err) {
        if (!cancelled) {
          setPrefill(null);
          if (!isAddingArrears) {
            toast.error(
              err instanceof Error ? err.message : 'Could not load accounting arrears',
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, propertyId, isAddingArrears]);

  const lockedProperty = Boolean(initialPropertyId);

  const applyPropertyDefaults = (kind: ArrearsKind) => {
    const property = properties.find((item) => item.id === propertyId);
    if (!property) return;

    if (kind === 'rent') {
      if (property.rentWeekly) {
        setRentAmount((prev) => prev.trim() || String(property.rentWeekly));
      }
      if (property.rentPaidUntil) {
        setRentPaidTo((prev) => prev.trim() || property.rentPaidUntil!.slice(0, 10));
      }
      return;
    }

    if (kind === 'bond') {
      if (property.bondAmount) {
        setBondAmount((prev) => prev.trim() || String(property.bondAmount));
      }
      if (property.leaseEnd) {
        setAgreementEndDate((prev) => prev.trim() || property.leaseEnd!.slice(0, 10));
      }
    }
  };

  const toggleArrearsKind = (kind: ArrearsKind) => {
    setSelectedKinds((prev) => {
      const selected = prev.includes(kind);
      if (selected) return prev.filter((item) => item !== kind);
      if (prefill) {
        applyKindPrefill(kind, prefill, {
          setRentAmount,
          setPaymentCycle,
          setRentPaidTo,
          setBills,
          setAgreementEndDate,
          setBondAmount,
          setBondNotes,
        });
      } else {
        applyPropertyDefaults(kind);
      }
      if (kind === 'bill') {
        setBills((prev) => (prev.length > 0 ? prev : [newBillRow()]));
      }
      return [...prev, kind];
    });
  };

  const dialogTitle = isAddingArrears ? 'Add arrears' : 'Add tribunal case';
  const dialogDescription = isAddingArrears
    ? 'Choose which arrears to record for this property — rent, bills, or bond — then fill in the details.'
    : 'Review accounting arrears for this property, then choose which to include in the tribunal case.';

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
      Boolean(agreementEndDate.trim()) ||
      Boolean(bondNotes.trim());

    if (selectedKinds.length === 0) {
      toast.error('Select at least one arrears type');
      return;
    }

    if (selectedKinds.includes('rent') && !hasRent) {
      toast.error('Fill in rent arrears details');
      return;
    }
    if (selectedKinds.includes('bill') && !hasBills) {
      toast.error('Add at least one bill arrears item');
      return;
    }
    if (selectedKinds.includes('bond') && !hasBond) {
      toast.error('Fill in bond arrears details');
      return;
    }

    if (!hasRent && !hasBills && !hasBond) {
      toast.error('Select and fill in at least one of Rent, Bill, or Bond arrears');
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
    if (selectedKinds.includes('rent') && hasRent) {
      body.rentArrears = {
        rentAmount: rentValue,
        paymentCycle: paymentCycle || undefined,
        rentPaidTo: rentPaidTo.trim() || undefined,
      };
    }
    if (selectedKinds.includes('bill') && hasBills) body.billArrears = billRows;
    if (selectedKinds.includes('bond') && hasBond) {
      body.bondArrears = {
        agreementEndDate: agreementEndDate.trim() || undefined,
        bondAmount: bondValue,
        notes: bondNotes.trim() || undefined,
      };
    }

    setSaving(true);
    try {
      if (isAddingArrears) {
        await createAgentPropertyArrears(propertyId, body);
        toast.success('Arrears recorded');
        onOpenChange(false);
        onCreated?.('');
        return;
      }

      const prepared = await preparePlatformCharge({
        serviceType: 'tribunal',
        propertyId,
      });

      if (prepared.paymentRequired) {
        if (!getStripePublishableKey()) {
          toast.error('Card payments are not configured on this environment.');
          return;
        }

        setPendingTribunalCreate({
          body,
          platformChargeId: prepared.paymentRequired.chargeId,
        });
        setPaymentDialog({
          clientSecret: prepared.paymentRequired.clientSecret,
          title: prepared.paymentRequired.title,
          description: prepared.paymentRequired.description,
          amountAud: prepared.paymentRequired.amountAud,
          calculationDetail: prepared.paymentRequired.calculationDetail,
          calculationSummary: prepared.paymentRequired.calculationSummary,
          customerSessionClientSecret: prepared.paymentRequired.customerSessionClientSecret,
          preferSavedCard: prepared.paymentRequired.preferSavedCard,
          defaultPaymentMethod: prepared.paymentRequired.defaultPaymentMethod,
        });
        return;
      }

      await finalizeTribunalCase(body, prepared.chargeId ?? undefined);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isAddingArrears
            ? 'Could not save arrears'
            : 'Could not create tribunal case',
      );
    } finally {
      setSaving(false);
    }
  };

  const finalizeTribunalCase = async (
    body: CreateAgentTribunalRentChasingInput,
    platformChargeId?: string,
  ) => {
    if (!propertyId) return;

    const result = await createAgentTribunalRentChasing(propertyId, {
      ...body,
      ...(platformChargeId ? { platformChargeId } : {}),
    });
    toast.success('Tribunal case created');
    setPendingTribunalCreate(null);
    onOpenChange(false);
    onCreated?.(result.id);
  };

  const handleTribunalPaymentSuccess = async () => {
    if (!pendingTribunalCreate) {
      setPaymentDialog(null);
      return;
    }

    setSaving(true);
    try {
      await finalizeTribunalCase(
        pendingTribunalCreate.body,
        pendingTribunalCreate.platformChargeId,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create tribunal case');
    } finally {
      setSaving(false);
      setPaymentDialog(null);
    }
  };

  const canSubmit =
    Boolean(propertyId) &&
    selectedKinds.length > 0 &&
    !saving &&
    !loading &&
    !paymentDialog;

  const showArrearsForm = Boolean(propertyId) && !loading;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingTribunalCreate(null);
            setPaymentDialog(null);
          }
          onOpenChange(nextOpen);
        }}
      >
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-4 py-3 text-left">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <Field label="Property">
            {lockedProperty ? (
              <p className="text-sm font-medium">
                {prefill?.propertyAddress ??
                  properties.find((p) => p.id === propertyId)?.address ??
                  'Selected property'}
              </p>
            ) : propertyOptions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No properties found.</p>
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
              Loading property details…
            </div>
          ) : !showArrearsForm ? (
            <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
              <p className="text-sm font-medium">No accounting arrears on file</p>
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                Add rent, bill, or bond arrears in Accounting before opening a tribunal case.
              </p>
            </div>
          ) : (
            <>
              {prefill?.arrears.length ? (
                <section className="space-y-2 rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm font-semibold">Accounting arrears</p>
                  <div className="overflow-hidden rounded-lg border bg-card">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wide">
                        <tr>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Item</th>
                          <th className="px-3 py-2 font-medium">Amount</th>
                          <th className="px-3 py-2 font-medium">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prefill.arrears.map((row, index) => (
                          <tr key={`${row.kind}-${row.name}-${index}`} className="border-t">
                            <td className="px-3 py-2 capitalize">{row.kind}</td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2 font-medium tabular-nums">
                              {row.amount != null ? formatCurrency(row.amount) : '—'}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground tabular-nums">
                              {row.dueDate ? formatDate(row.dueDate) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isAddingArrears ? 'Arrears to add' : 'Include in tribunal case'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isAddingArrears
                    ? 'Select one or more arrears types, then complete the sections below.'
                    : 'Select one or more arrears types for this tribunal case, then complete the sections below.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ARREARS_KIND_OPTIONS.filter((option) =>
                    selectableKinds.includes(option.id),
                  ).map((option) => {
                    const selected = selectedKinds.includes(option.id);
                    return (
                      <SelectChip
                        key={option.id}
                        selected={selected}
                        onClick={() => toggleArrearsKind(option.id)}
                      >
                        {option.label}
                      </SelectChip>
                    );
                  })}
                </div>
                {selectableKinds.length > 0 && selectedKinds.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Select at least one arrears type to continue.
                  </p>
                ) : null}
              </div>

              {selectedKinds.includes('rent') ? (
              <Section
                title="Rent Arrears"
                description={
                  isAddingArrears
                    ? 'Record the outstanding rent for this property.'
                    : 'From Accounting — adjust if needed before creating the case.'
                }
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
              ) : null}

              {selectedKinds.includes('bill') ? (
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
              ) : null}

              {selectedKinds.includes('bond') ? (
              <Section
                title="Bond Arrears"
                description="Agreement end drives days overdue once the tenant has vacated. Bond syncs to the property profile."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Agreement end date">
                    <Input
                      type="date"
                      value={agreementEndDate}
                      onChange={(e) => setAgreementEndDate(e.target.value)}
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
                    <AgentInputFeedbackAnchor kind="internal_note" value={bondNotes}>
                      <textarea
                        value={bondNotes}
                        data-input-kind="internal_note"
                        data-allow-emoji
                        maxLength={10000}
                        onChange={bindSanitizedTextValue({
                          kind: 'internal_note',
                          allowEmoji: true,
                          onChange: (e) => setBondNotes(e.target.value),
                        })}
                        rows={3}
                        disabled={saving || !propertyId}
                        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Bond claim notes…"
                      />
                    </AgentInputFeedbackAnchor>
                  </Field>
                </div>
              </Section>
              ) : null}
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
          <Button type="button" onClick={() => void submit()} disabled={!canSubmit}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isAddingArrears ? 'Saving…' : 'Creating…'}
              </>
            ) : isAddingArrears ? (
              'Save arrears'
            ) : (
              'Create case'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPaymentDialog(null);
            if (!saving) setPendingTribunalCreate(null);
          }
        }}
        onSuccess={handleTribunalPaymentSuccess}
      />
    </>
  );
}
