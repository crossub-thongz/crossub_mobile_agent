'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Building2,
  Calendar,
  CircleDollarSign,
  Loader2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RentReconciliationProperty } from '@/lib/rent-reconciliation';
import { createAgentRentReconciliation } from '@/lib/crossub-api/agent-workflow-client';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS = ['cash', 'cheque', 'card', 'eft'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  card: 'Card',
  eft: 'EFT',
};

export type RentReconciliationSubmission = {
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  rentAllocation: number;
  bondAllocation: number;
  note?: string;
};

function partyCode(prefix: 'TEN' | 'OWN', propertyId: string): string {
  const digits = propertyId.replace(/\D/g, '').padStart(5, '0').slice(-5);
  return `${prefix}${digits}`;
}

function formatDateShort(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateSlash(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseCurrencyInput(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatCurrencyCents(amount: number): string {
  if (amount <= 0) return '';
  return amount.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SectionCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm',
        className,
      )}
    >
      {title ? (
        <h3 className="border-b border-border/60 bg-muted/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof UserRound;
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-400">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">{value}</p>
        {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

function AllocationCard({
  title,
  due,
  description,
  amountDue,
  amount,
  onAmountChange,
  descriptionEditable,
  onDescriptionChange,
}: {
  title: string;
  due: string;
  description: string;
  amountDue: string;
  amount: string;
  onAmountChange: (value: string) => void;
  descriptionEditable?: boolean;
  onDescriptionChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-3.5 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Due {due}</p>
        </div>
        {amountDue !== '—' ? (
          <span className="shrink-0 rounded-md bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-800 dark:text-rose-200">
            {amountDue} due
          </span>
        ) : null}
      </div>
      {descriptionEditable ? (
        <Field label="Description">
          <Input
            value={description}
            onChange={(e) => onDescriptionChange?.(e.target.value)}
            className="h-10"
          />
        </Field>
      ) : (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <Field label="Amount">
        <Input
          inputMode="decimal"
          placeholder="$0.00"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="h-11 text-right text-base font-medium tabular-nums"
        />
      </Field>
    </div>
  );
}

function OptionCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border"
      />
      {label}
    </label>
  );
}

export function RentReconciliationDialog({
  open,
  onOpenChange,
  propertyId,
  property,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  property: RentReconciliationProperty | null;
  onSubmitted?: (submission: RentReconciliationSubmission) => void;
}) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('eft');
  const [rentAllocation, setRentAllocation] = useState('');
  const [bondAllocation, setBondAllocation] = useState('');
  const [bondDescription, setBondDescription] = useState('');
  const [addRentCredit, setAddRentCredit] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(true);
  const [receiptToSupplier, setReceiptToSupplier] = useState(false);
  const [addNote, setAddNote] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const rentAllocationManual = useRef(false);
  const bondAllocationManual = useRef(false);

  const rentDueDate = property
    ? addDays(property.paidToDate, property.rentCycleLabel === 'Weekly' ? 7 : 30)
    : '';
  const fullAddress = property ? `${property.address}, ${property.suburb}` : '';
  const rentLedgerDescription = property
    ? `Paid to ${formatDateSlash(property.paidToDate)}`
    : '';

  useEffect(() => {
    if (!open || !property) return;
    rentAllocationManual.current = false;
    bondAllocationManual.current = false;
    setAmount('');
    setPaymentDate(todayIso());
    setPaymentMethod('eft');
    setRentAllocation('');
    setBondAllocation('');
    setBondDescription(`Bond — ${property.address}, ${property.suburb}`);
    setAddRentCredit(false);
    setPrintReceipt(true);
    setReceiptToSupplier(false);
    setAddNote(false);
    setNote('');
    // Reset only when the dialog opens or the property changes — not when the
    // parent rebuilds the property object on background portal polls.
  }, [open, property?.id, property?.address, property?.suburb]);
  const defaultBondDescription = property ? `Bond — ${fullAddress}` : '';
  const rentAmountDue =
    property && property.rentArrearsAmount > 0
      ? formatCurrencyCents(property.rentArrearsAmount)
      : '—';

  const allocationTotal = useMemo(
    () => parseCurrencyInput(rentAllocation) + parseCurrencyInput(bondAllocation),
    [rentAllocation, bondAllocation],
  );

  const headerAmount = parseCurrencyInput(amount) || allocationTotal;

  const syncRentAllocationFromAmount = (amountValue: string, bondValue: string) => {
    if (rentAllocationManual.current) return;
    const parsedAmount = parseCurrencyInput(amountValue);
    const parsedBond = parseCurrencyInput(bondValue);
    const rentPart = Math.max(0, parsedAmount - parsedBond);
    setRentAllocation(rentPart > 0 ? formatCurrencyCents(rentPart) : '');
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    syncRentAllocationFromAmount(value, bondAllocation);
  };

  const handleRentAllocationChange = (value: string) => {
    rentAllocationManual.current = true;
    setRentAllocation(value);
  };

  const handleBondAllocationChange = (value: string) => {
    bondAllocationManual.current = true;
    setBondAllocation(value);
    syncRentAllocationFromAmount(amount, value);
  };

  const resolveAllocations = (total: number) => {
    let rent = parseCurrencyInput(rentAllocation);
    let bond = parseCurrencyInput(bondAllocation);
    if (rent <= 0 && bond <= 0) {
      rent = total;
    } else if (rent + bond < total) {
      rent += total - rent - bond;
    }
    return { rent, bond };
  };

  const handleSubmit = async () => {
    if (!property || saving) return;
    const total = headerAmount;
    if (total <= 0) {
      toast.error('Enter a payment amount or allocation');
      return;
    }
    const { rent, bond } = resolveAllocations(total);
    const submission: RentReconciliationSubmission = {
      amount: total,
      paymentDate,
      paymentMethod,
      rentAllocation: rent,
      bondAllocation: bond,
      note: addNote && note.trim() ? note.trim() : undefined,
    };

    setSaving(true);
    try {
      await createAgentRentReconciliation(propertyId, {
        amount: submission.amount,
        paymentDate: submission.paymentDate,
        paymentMethod: submission.paymentMethod,
        rentAllocation: rent > 0 ? rent : undefined,
        bondAllocation: bond > 0 ? bond : undefined,
        rentDescription: rent > 0 ? rentLedgerDescription : undefined,
        bondDescription: bond > 0 ? bondDescription.trim() || defaultBondDescription : undefined,
        note: submission.note,
      });
      toast.success(`Rent reconciliation recorded for ${property.address}`);
      onSubmitted?.(submission);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not record rent reconciliation',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        elevated
        className={cn(
          'fixed inset-x-0 bottom-0 left-0 top-auto flex h-[min(100dvh,920px)] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 shadow-2xl',
          'sm:inset-auto sm:top-[50%] sm:left-[50%] sm:h-auto sm:max-h-[min(92vh,920px)] sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl sm:border',
        )}
      >
        <header className="shrink-0 border-b border-border/80 bg-muted/20 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1 pr-2">
              <DialogTitle className="text-base font-semibold text-foreground sm:text-lg">
                Add rent reconciliation
              </DialogTitle>
              <DialogDescription className="line-clamp-2 text-xs sm:text-sm">
                {fullAddress} · Ref {property.referenceCode}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white tabular-nums sm:inline-flex">
                {formatCurrencyCents(headerAmount) || '$0.00'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 sm:hidden">
            <span className="text-xs font-medium text-muted-foreground">Total payment</span>
            <span className="text-base font-semibold text-sky-800 tabular-nums dark:text-sky-200">
              {formatCurrencyCents(headerAmount) || '$0.00'}
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
          <SectionCard title="Property details">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryTile
                icon={UserRound}
                label="Tenant"
                value={property.tenantName}
                sub={partyCode('TEN', property.id)}
              />
              <SummaryTile
                icon={UsersRound}
                label="Owner"
                value={property.ownerName}
                sub={partyCode('OWN', property.id)}
              />
              <SummaryTile
                icon={Building2}
                label="Property"
                value={fullAddress}
                sub={`Paid to ${formatDateShort(property.paidToDate)}`}
              />
              <SummaryTile
                icon={CircleDollarSign}
                label="Rent"
                value={formatCurrencyCents(property.currentRent) || '$0.00'}
                sub={`${property.rentCycleLabel} · reference on payment`}
              />
            </div>
          </SectionCard>

          <SectionCard title="Payment">
            <div className="space-y-4">
              <Field label="Amount received">
                <Input
                  id="recon-amount"
                  inputMode="decimal"
                  placeholder="$0.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="h-12 text-right text-lg font-semibold tabular-nums"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Payment date">
                  <div className="relative">
                    <Input
                      id="recon-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <Calendar className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>
                <Field label="Payment method">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PAYMENT_METHODS.map((method) => {
                      const selected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={cn(
                            'h-11 rounded-lg border text-sm font-medium transition-colors',
                            selected
                              ? 'border-slate-700 bg-slate-700 text-white dark:border-slate-500 dark:bg-slate-600'
                              : 'border-border bg-background text-foreground hover:bg-muted/50',
                          )}
                        >
                          {PAYMENT_METHOD_LABEL[method]}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Allocation">
            <div className="space-y-3 md:space-y-0">
              <AllocationCard
                title="Rent"
                due={formatDateShort(rentDueDate)}
                description={rentLedgerDescription}
                amountDue={rentAmountDue}
                amount={rentAllocation}
                onAmountChange={handleRentAllocationChange}
              />
              <AllocationCard
                title="Bond"
                due="—"
                description={bondDescription}
                amountDue="—"
                amount={bondAllocation}
                onAmountChange={handleBondAllocationChange}
                descriptionEditable
                onDescriptionChange={setBondDescription}
              />

              <div className="hidden overflow-hidden rounded-lg border border-border/70 md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/40 text-xs text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-medium">Allocation</th>
                      <th className="px-3 py-2.5 text-left font-medium">Due</th>
                      <th className="px-3 py-2.5 text-left font-medium">Description</th>
                      <th className="px-3 py-2.5 text-right font-medium">Amount due</th>
                      <th className="w-36 px-3 py-2.5 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/60">
                      <td className="px-3 py-3 font-medium">Rent</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDateShort(rentDueDate)}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {rentLedgerDescription}
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{rentAmountDue}</td>
                      <td className="px-3 py-3">
                        <Input
                          inputMode="decimal"
                          placeholder="$0.00"
                          value={rentAllocation}
                          onChange={(e) => handleRentAllocationChange(e.target.value)}
                          className="h-10 text-right tabular-nums"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-3 font-medium">Bond</td>
                      <td className="px-3 py-3 text-muted-foreground">—</td>
                      <td className="px-3 py-3">
                        <Input
                          value={bondDescription}
                          onChange={(e) => setBondDescription(e.target.value)}
                          className="h-10"
                        />
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">—</td>
                      <td className="px-3 py-3">
                        <Input
                          inputMode="decimal"
                          placeholder="$0.00"
                          value={bondAllocation}
                          onChange={(e) => handleBondAllocationChange(e.target.value)}
                          className="h-10 text-right tabular-nums"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Options">
            <div className="grid gap-3 sm:grid-cols-2">
              <OptionCheckbox
                checked={addRentCredit}
                onChange={setAddRentCredit}
                label="Add rent credit"
              />
              <OptionCheckbox checked={printReceipt} onChange={setPrintReceipt} label="Print receipt" />
              <OptionCheckbox
                checked={receiptToSupplier}
                onChange={setReceiptToSupplier}
                label="Receipt to supplier"
              />
              <OptionCheckbox checked={addNote} onChange={setAddNote} label="Add note" />
            </div>
            {addNote ? (
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for this reconciliation…"
                rows={3}
                className="mt-3 min-h-[88px]"
              />
            ) : null}
          </SectionCard>
        </div>

        <footer className="shrink-0 border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:min-w-28 sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700 sm:min-w-44 sm:w-auto"
              onClick={() => void handleSubmit()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Recording…
                </>
              ) : (
                <>Record {formatCurrencyCents(headerAmount) || '$0.00'}</>
              )}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
