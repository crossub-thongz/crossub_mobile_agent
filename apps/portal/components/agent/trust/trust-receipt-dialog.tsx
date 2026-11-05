'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  TRUST_LEDGER_KIND,
  TRUST_LEDGER_STATUS,
  TRUST_PAGE_SIZE_MAX,
  TRUST_PAYMENT_METHOD,
  TRUST_RECEIPT_ALLOCATION_KIND,
  TRUST_RECEIPT_COPY as COPY,
  TRUST_RECEIPT_METHOD_LABEL,
  TRUST_RECEIPT_METHOD_ORDER,
  TRUST_RECEIPT_RENT_PERIOD_LABEL,
  type TrustPaymentMethod,
  type TrustRentPeriod,
} from '@/constants/trust';
import { TRUST_PREVIEW_DEBOUNCE_MS, TRUST_RECEIPT_INVOICE_COPY as INVOICE_COPY } from '@/constants/trust-invoices';
import { TRUST_TRANSACTION_LIMITS } from '@/constants/trust-transactions';
import { useDebouncedValue, useTrustResource } from '@/hooks/use-trust-resource';
import { fetchProperty } from '@/lib/crossub-api/agent-client';
import {
  fetchTrustLedger,
  fetchTrustLedgers,
  postTrustTenantReceipt,
  type TrustBankLineInput,
} from '@/lib/crossub-api/agent-trust-client';
import {
  fetchTrustOpenInvoices,
  fetchTrustReceiptPreview,
  type TrustReceiptPreview,
  type TrustTenantInvoice,
} from '@/lib/crossub-api/agent-trust-invoices-client';
import {
  centsToDollarsInput,
  formatCents,
  formatTrustDate,
  newTrustIdempotencyKey,
  parseDollarsToCents,
  trustTodayKey,
} from '@/lib/trust-accounting';
import {
  filterReceiptTenancies,
  loadReceiptTenancies,
  toReceiptTenancy,
  type ReceiptTenancy,
} from '@/lib/trust-tenancy-search';
import { amountFromWeekly } from '@/lib/rent-calculations';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { trustIdempotencyKeyAfterError } from '@/utils/trust-transactions';
import { cn } from '@/lib/utils';

/** Calendar days from `fromKey` to `toKey`. Negative when `toKey` is earlier. */
function calendarDaysBetween(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

function addCalendarDays(key: string, days: number): string {
  const parsed = Date.parse(`${key.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return key;
  const next = new Date(parsed + days * 86_400_000);
  const month = String(next.getUTCMonth() + 1).padStart(2, '0');
  const day = String(next.getUTCDate()).padStart(2, '0');
  return `${next.getUTCFullYear()}-${month}-${day}`;
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Same month-end rule as the rent engine: 31 Jan + 1 month is 28 Feb, then 31 Mar. */
function addCalendarMonths(key: string, months: number): string {
  const [year, month, day] = key.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return key;
  const monthIndex = month - 1;
  const wasMonthEnd = day === daysInUtcMonth(year, monthIndex);
  const target = new Date(Date.UTC(year, monthIndex + months, 1));
  const targetDays = daysInUtcMonth(target.getUTCFullYear(), target.getUTCMonth());
  target.setUTCDate(wasMonthEnd ? targetDays : Math.min(day, targetDays));
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  const d = String(target.getUTCDate()).padStart(2, '0');
  return `${target.getUTCFullYear()}-${m}-${d}`;
}

/** Paid-to after `count` more whole periods. Weekly is 7 days, fortnightly 14, monthly a calendar month. */
function addRentPeriods(paidTo: string, period: string, count: number): string {
  const cycle = period.toUpperCase();
  if (cycle === 'FORTNIGHTLY') return addCalendarDays(paidTo, 14 * count);
  if (cycle === 'MONTHLY') return addCalendarMonths(paidTo, count);
  if (cycle === 'YEARLY') return addCalendarMonths(paidTo, 12 * count);
  return addCalendarDays(paidTo, 7 * count);
}

/**
 * What this rent allocation buys, counted from the last paid-to. The receipt date is not an input.
 * A held part payment is added to this payment before the periods are counted. The preview wins
 * once it has arrived, because a rent change can make one period cost more or less than the rent.
 */
function projectReceiptRent(input: {
  paidTo: string | null;
  period: string | null;
  rentCents: number | null;
  paymentCents: number | null;
  partPaymentCents: number | null;
}): { paidToBefore: string; paidToAfter: string; periodsCovered: number; partPaymentAfterCents: number } | null {
  const paidTo = input.paidTo?.slice(0, 10) ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidTo) || !input.period) return null;
  const payment = input.paymentCents ?? 0;
  const rent = input.rentCents ?? 0;
  if (!Number.isFinite(payment) || payment <= 0 || !Number.isFinite(rent) || rent <= 0) return null;
  const available = payment + Math.max(input.partPaymentCents ?? 0, 0);
  const periodsCovered = Math.floor(available / rent);
  const paidToAfter = periodsCovered > 0 ? addRentPeriods(paidTo, input.period, periodsCovered) : paidTo;
  return {
    paidToBefore: paidTo,
    paidToAfter,
    periodsCovered,
    partPaymentAfterCents: available - periodsCovered * rent,
  };
}

/**
 * One or more whole periods: "03/11/2026 – 09/11/2026".
 * Short of one period: "Paid to 02/11/2026 + Part payment of $500.00".
 * Whole periods with money left over join both sentences.
 */
function rentPaymentPeriodLabel(input: {
  paidTo: string | null;
  period: string | null;
  rentCents: number | null;
  paymentCents: number | null;
  partPaymentCents: number | null;
  preview: {
    paidToBefore?: string | null;
    paidToAfter?: string | null;
    periodsCovered?: number | null;
    partPaymentAfterCents?: number | null;
  } | null;
}): string | null {
  const fromPreview = input.preview?.paidToBefore ? input.preview : null;
  const position = fromPreview
    ? {
        paidToBefore: fromPreview.paidToBefore ?? '',
        paidToAfter: fromPreview.paidToAfter ?? fromPreview.paidToBefore ?? '',
        periodsCovered: fromPreview.periodsCovered ?? 0,
        partPaymentAfterCents: fromPreview.partPaymentAfterCents ?? 0,
      }
    : projectReceiptRent(input);
  if (!position?.paidToBefore) return null;

  const partCents = position.partPaymentAfterCents;
  if (position.periodsCovered <= 0) {
    if (partCents <= 0) return null;
    return COPY.rentPartPayment(formatPaidToSlash(position.paidToBefore), formatCents(partCents));
  }

  const start = addCalendarDays(position.paidToBefore, 1);
  const end = position.paidToAfter;
  if (!end || end < start) return null;
  const range = COPY.rentPeriod(formatPaidToSlash(start), formatPaidToSlash(end));
  if (partCents > 0) {
    return `${range}, ${COPY.rentPartPayment(formatPaidToSlash(end), formatCents(partCents))}`;
  }
  return range;
}

/** Paid-to as dd/mm/yyyy, the form the rent status line uses. */
function formatPaidToSlash(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

/** Blank is zero. Anything else must be a dollar amount. */
function centsOf(input: string): number | null {
  if (!input.trim()) return 0;
  return parseDollarsToCents(input);
}

function rentDetailsLabel(cents: number | null | undefined, period: string | null | undefined): string {
  if (cents == null || !period) return COPY.empty;
  const per =
    TRUST_RECEIPT_RENT_PERIOD_LABEL[period as TrustRentPeriod] ??
    (period.toUpperCase() === 'YEARLY' ? 'yearly' : null);
  return per ? `${formatCents(cents)} ${per}` : formatCents(cents);
}

/** The tenancy rent lives on the property (`rentWeekly` plus the agreed cycle), not on the ledger. */
function tenancyRentFigure(property: {
  rentWeekly?: number | null;
  rentPeriod?: string | null;
  rentPaidUntil?: string | null;
} | null | undefined): { cents: number; period: string; paidTo: string | null } | null {
  const weekly = property?.rentWeekly;
  if (typeof weekly !== 'number' || weekly <= 0) return null;
  const period = String(property?.rentPeriod ?? 'WEEKLY').toUpperCase();
  const cycle = period === 'FORTNIGHTLY' ? 'fortnightly' : period === 'MONTHLY' ? 'monthly' : 'weekly';
  const dollars = period === 'YEARLY' ? Math.round(weekly * 52 * 100) / 100 : amountFromWeekly(weekly, cycle);
  const paidTo = typeof property?.rentPaidUntil === 'string' ? property.rentPaidUntil.slice(0, 10) : null;
  return { cents: Math.round(dollars * 100), period, paidTo };
}

function partyLabel(name: string, code: string): string {
  const who = name.trim();
  const ref = code.trim();
  if (who && ref) return `${who} (${ref})`;
  return who || ref || COPY.empty;
}

/**
 * A tenant receipt: pick the tenancy, then allocate the amount across rent, a deposit and any open
 * invoices. Rent's description is the period this payment covers. A bank-line open locks the
 * amount to that line. Mount it per open.
 */
export function TrustReceiptDialog({
  agencyId,
  bankAccountId,
  row = null,
  lockedAmountCents,
  bankLine,
  onClose,
  onReceipted,
}: {
  agencyId: string;
  bankAccountId: string;
  /** The tenancy already chosen, when the dialog was opened from one. Search can replace it. */
  row?: Parameters<typeof toReceiptTenancy>[0];
  /** Set when this receipt was opened from a bank file or QIF line. */
  lockedAmountCents?: number;
  /** The bank line to reconcile, sent back exactly as it was read. */
  bankLine?: TrustBankLineInput;
  onClose: () => void;
  onReceipted: () => void;
}) {
  const amountLocked = lockedAmountCents != null;
  const [selected, setSelected] = useState<ReceiptTenancy | null>(() => toReceiptTenancy(row ?? null));
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState(() => (amountLocked ? centsToDollarsInput(lockedAmountCents) : ''));
  const [rentAmount, setRentAmount] = useState(() =>
    amountLocked ? centsToDollarsInput(lockedAmountCents) : '',
  );
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDetails, setDepositDetails] = useState('');
  const [invoiceAmounts, setInvoiceAmounts] = useState<Record<string, string>>({});
  const [date, setDate] = useState(bankLine?.lineDate ?? trustTodayKey());
  const [method, setMethod] = useState<TrustPaymentMethod>(TRUST_PAYMENT_METHOD.EFT);
  const depositEdited = useRef(false);
  const [addNote, setAddNote] = useState(false);
  const [note, setNote] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim());

  const tenancies = useTrustResource(`${agencyId}:${bankAccountId}:receipt-tenancies`, () =>
    loadReceiptTenancies(agencyId, bankAccountId),
  );
  const matches = filterReceiptTenancies(tenancies.data ?? [], debouncedQuery);

  const ledger = useTrustResource(selected ? `${agencyId}:${selected.ledgerId}:receipt` : null, () =>
    fetchTrustLedger(agencyId, selected!.ledgerId),
  );
  const propertyId = ledger.data?.propertyId ?? null;
  const owners = useTrustResource(
    selected && propertyId ? `${agencyId}:${bankAccountId}:${propertyId}:receipt-owner` : null,
    () =>
      fetchTrustLedgers(agencyId, bankAccountId, {
        kind: TRUST_LEDGER_KIND.OWNER,
        status: TRUST_LEDGER_STATUS.OPEN,
        propertyId: propertyId ?? undefined,
        pageSize: TRUST_PAGE_SIZE_MAX,
      }),
  );
  const openInvoices = useTrustResource(selected ? `${agencyId}:${selected.ledgerId}:open-invoices` : null, () =>
    fetchTrustOpenInvoices(agencyId, selected!.ledgerId),
  );

  const profile = ledger.data?.rentProfile ?? null;
  const trustRentCents = typeof profile?.rentAmountCents === 'number' ? profile.rentAmountCents : selected?.rentAmountCents ?? null;
  const trustRentPeriod = profile?.rentPeriod ?? selected?.rentPeriod ?? null;
  const tenancyRent = useTrustResource(
    selected && propertyId && trustRentCents == null ? `${propertyId}:tenancy-rent` : null,
    () => fetchProperty(propertyId!),
  );
  const tenancy = trustRentCents == null ? tenancyRentFigure(tenancyRent.data) : null;
  const propertyAddress =
    ledger.data?.propertyAddress ||
    selected?.propertyAddress ||
    ledger.data?.propertyReferenceAddress ||
    selected?.propertyReferenceAddress ||
    '';
  const paidToDate = profile?.paidToDate ?? selected?.paidToDate ?? tenancy?.paidTo ?? null;
  const partPaymentCents = typeof profile?.partPaymentCents === 'number' ? profile.partPaymentCents : null;
  const effectivePaidTo = profile?.effectivePaidToDate ?? selected?.effectivePaidToDate ?? paidToDate;
  const arrearsDays =
    typeof profile?.arrearsDays === 'number'
      ? profile.arrearsDays
      : typeof selected?.arrearsDays === 'number'
        ? selected.arrearsDays
        : effectivePaidTo
          ? calendarDaysBetween(trustTodayKey(), effectivePaidTo)
          : null;
  const overdueDays = arrearsDays != null && arrearsDays < 0 ? Math.abs(arrearsDays) : null;
  const rentLabel = rentDetailsLabel(trustRentCents ?? tenancy?.cents ?? null, trustRentPeriod ?? tenancy?.period ?? null);
  const hasRentProfile = profile != null || Boolean(selected?.hasRentProfile);
  const ownerLabel =
    owners.data?.items
      .map((owner: { name?: string | null; code?: string | null }) => partyLabel(owner.name ?? '', owner.code ?? ''))
      .join(' & ') || COPY.empty;
  const invoices = openInvoices.data ?? [];

  useEffect(() => {
    if (depositEdited.current) return;
    setDepositDetails(propertyAddress ? COPY.depositPlaceholder(propertyAddress) : '');
  }, [selected?.ledgerId, propertyAddress]);

  const depositCents = centsOf(depositAmount);
  const invoiceRows = invoices.map((invoice) => ({
    invoice,
    cents: centsOf(invoiceAmounts[invoice.id] ?? ''),
  }));
  const invoicesOk = invoiceRows.every((row) => row.cents != null);
  const invoiceTotal = invoicesOk ? invoiceRows.reduce((sum, row) => sum + (row.cents ?? 0), 0) : null;
  const rentCents = amountLocked
    ? depositCents != null && invoiceTotal != null
      ? Math.max(lockedAmountCents - depositCents - invoiceTotal, 0)
      : null
    : centsOf(rentAmount);
  const rentInput = amountLocked && rentCents != null ? centsToDollarsInput(rentCents) : rentAmount;
  const headerCents = amountLocked ? lockedAmountCents : amount.trim() ? centsOf(amount) : null;

  /** Rent is whatever of the typed amount the deposit and invoices have not taken. */
  function applyRemainder(nextAmount: string, nextDeposit: string, invoicesCents: number) {
    if (!nextAmount.trim()) {
      setRentAmount('');
      return;
    }
    const total = centsOf(nextAmount);
    const deposit = centsOf(nextDeposit);
    if (total == null || deposit == null) return;
    setRentAmount(centsToDollarsInput(Math.max(total - deposit - invoicesCents, 0)));
  }

  function onAmountChange(next: string) {
    if (amountLocked) return;
    setAmount(next);
    applyRemainder(next, depositAmount, invoiceTotal ?? 0);
  }

  function onDepositChange(next: string) {
    setDepositAmount(next);
    if (amountLocked || (centsOf(next) == null && next.trim())) return;
    applyRemainder(amount, next, invoiceTotal ?? 0);
  }

  const firstInvoice = invoiceRows.find((row) => (row.cents ?? 0) > 0) ?? null;
  const preview = useReceiptPreview({
    agencyId,
    bankAccountId,
    ledgerId: selected?.ledgerId ?? '',
    date,
    rentCents: hasRentProfile && rentCents != null && rentCents > 0 ? rentCents : null,
    invoiceId: firstInvoice?.invoice.id ?? null,
    invoiceCents: firstInvoice?.cents ?? null,
  });
  const rentPeriodLabel = selected
    ? rentPaymentPeriodLabel({
        paidTo: paidToDate,
        period: trustRentPeriod ?? tenancy?.period ?? null,
        rentCents: trustRentCents ?? tenancy?.cents ?? null,
        paymentCents: rentCents,
        partPaymentCents,
        preview: preview?.rent ?? null,
      })
    : null;

  function chooseTenancy(tenancy: ReceiptTenancy) {
    depositEdited.current = false;
    setSelected(tenancy);
    setQuery('');
    setInvoiceAmounts({});
  }

  function setInvoiceAmount(invoiceId: string, value: string) {
    const nextAmounts = { ...invoiceAmounts, [invoiceId]: value };
    setInvoiceAmounts(nextAmounts);
    if (amountLocked || (centsOf(value) == null && value.trim())) return;
    const nextTotal = invoices.reduce((sum, invoice) => sum + (centsOf(nextAmounts[invoice.id] ?? '') ?? 0), 0);
    applyRemainder(amount, depositAmount, nextTotal);
  }

  async function onSubmit() {
    if (!selected) {
      toast.error(COPY.pickTenant);
      return;
    }
    if (!date) {
      toast.error(COPY.dateRequired);
      return;
    }
    const headerCents = amountLocked ? lockedAmountCents : centsOf(amount);
    if (rentCents == null || depositCents == null || !invoicesOk || headerCents == null) {
      toast.error(COPY.amountFormat);
      return;
    }
    if (headerCents <= 0) {
      toast.error(COPY.amountInvalid);
      return;
    }
    if (rentCents + depositCents + (invoiceTotal ?? 0) !== headerCents) {
      toast.error(COPY.allocateAll);
      return;
    }
    const allocations: { kind: string; amountCents: number; invoiceId?: string; details?: string }[] = [];
    if (rentCents > 0) {
      allocations.push({ kind: TRUST_RECEIPT_ALLOCATION_KIND.RENT, amountCents: rentCents });
    }
    if (depositCents > 0) {
      allocations.push({
        kind: TRUST_RECEIPT_ALLOCATION_KIND.DEPOSIT,
        amountCents: depositCents,
        details: depositDetails.trim() || undefined,
      });
    }
    for (const row of invoiceRows) {
      const cents = row.cents ?? 0;
      if (cents === 0) continue;
      if (cents > row.invoice.outstandingCents) {
        toast.error(INVOICE_COPY.overOutstanding(formatCents(row.invoice.outstandingCents)));
        return;
      }
      allocations.push({
        kind: TRUST_RECEIPT_ALLOCATION_KIND.INVOICE,
        amountCents: cents,
        invoiceId: row.invoice.id,
      });
    }
    if (allocations.length === 0) {
      toast.error(COPY.amountInvalid);
      return;
    }

    setPending(true);
    try {
      const tx = await postTrustTenantReceipt(agencyId, bankAccountId, {
        idempotencyKey,
        ledgerId: selected.ledgerId,
        effectiveDate: date,
        method,
        allocations,
        description: addNote && note.trim() ? note.trim() : undefined,
        ...(bankLine ? { bankLine } : {}),
      });
      toast.success(COPY.done(tx.receiptNumber));
      onReceipted();
      onClose();
    } catch (err) {
      setIdempotencyKey(trustIdempotencyKeyAfterError(err, idempotencyKey));
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
        onPointerDownOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-sky-700">{COPY.title}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>

        <div className="grid items-center gap-x-8 gap-y-3 text-sm lg:grid-cols-2">
          <Fact label={COPY.tenant}>
            {selected ? (
              <div className="flex h-9 items-center">
                <span className="truncate font-medium">{partyLabel(selected.ledgerName, selected.ledgerCode)}</span>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={query}
                  disabled={pending}
                  placeholder={COPY.tenantSearch}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-9"
                />
                {debouncedQuery ? (
                  <div className="bg-popover absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border shadow-md">
                    {tenancies.loading && !tenancies.data ? (
                      <p className="text-muted-foreground px-3 py-2 text-sm">Loading…</p>
                    ) : tenancies.error ? (
                      <p className="text-destructive px-3 py-2 text-sm">{apiErrorMessage(tenancies.error)}</p>
                    ) : matches.length === 0 ? (
                      <p className="text-muted-foreground px-3 py-2 text-sm">{COPY.noTenants}</p>
                    ) : (
                      <ul>
                        {matches.map((tenancy) => (
                          <li key={tenancy.ledgerId} className="border-b last:border-b-0">
                            <button
                              type="button"
                              className="hover:bg-muted w-full px-3 py-2 text-left"
                              onClick={() => chooseTenancy(tenancy)}
                            >
                              <p className="text-sm font-medium">
                                {partyLabel(tenancy.ledgerName, tenancy.ledgerCode)}
                              </p>
                              <p className="text-muted-foreground truncate text-xs">
                                {tenancy.propertyAddress || tenancy.propertyReferenceAddress || COPY.empty}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </Fact>
          <SideField label={COPY.amount}>
            <Input
              inputMode="decimal"
              value={amountLocked ? centsToDollarsInput(lockedAmountCents) : amount}
              disabled={pending || amountLocked}
              readOnly={amountLocked}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder=""
              className={cn('h-9 text-right tabular-nums', amountLocked && 'bg-muted')}
            />
          </SideField>
          <Fact label={COPY.owner}>{ownerLabel}</Fact>
          <SideField label={COPY.date}>
            <Input
              type="date"
              value={date}
              max={trustTodayKey()}
              disabled={pending || bankLine != null}
              onChange={(event) => setDate(event.target.value)}
              className="h-9"
            />
          </SideField>
          <Fact label={COPY.property}>{propertyAddress || COPY.empty}</Fact>
          <div className="flex flex-wrap justify-end gap-1.5">
            {TRUST_RECEIPT_METHOD_ORDER.map((item) => {
              const selectedMethod = method === item;
              return (
                <button
                  key={item}
                  type="button"
                  disabled={pending}
                  onClick={() => setMethod(item)}
                  className={cn(
                    'h-9 rounded-md border px-3 text-sm font-medium',
                    selectedMethod
                      ? 'border-slate-700 bg-slate-700 text-white'
                      : 'border-border bg-background hover:bg-muted',
                  )}
                >
                  {TRUST_RECEIPT_METHOD_LABEL[item]}
                </button>
              );
            })}
          </div>
          <Fact label={COPY.details}>{selected ? rentLabel : COPY.empty}</Fact>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{COPY.allocation}</th>
                <th className="px-3 py-2 text-left font-medium">{COPY.due}</th>
                <th className="px-3 py-2 text-left font-medium">{COPY.allocationDescription}</th>
                <th className="px-3 py-2 text-left font-medium">{COPY.amountDue}</th>
                <th className="w-36 px-3 py-2 text-right font-medium">{COPY.allocationAmount}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-3 py-2 font-medium">{COPY.rentAllocation}</td>
                <td className={cn('px-3 py-2', overdueDays != null ? 'text-destructive' : 'text-muted-foreground')}>
                  {formatTrustDate(paidToDate)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {rentPeriodLabel ?? <span className="text-muted-foreground">{COPY.empty}</span>}
                </td>
                <td className="text-muted-foreground px-3 py-2">
                  {overdueDays != null ? COPY.overdueDays(overdueDays) : null}
                </td>
                <td className="px-3 py-2">
                  <Input
                    inputMode="decimal"
                    value={rentInput}
                    readOnly
                    disabled={pending}
                    placeholder="$0.00"
                    className="h-9 text-right tabular-nums"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">{COPY.depositAllocation}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2">
                  <Input
                    value={depositDetails}
                    disabled={pending}
                    onChange={(event) => {
                      depositEdited.current = true;
                      setDepositDetails(event.target.value);
                    }}
                    placeholder={COPY.depositPlaceholder(propertyAddress || '')}
                    className="h-9"
                  />
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2">
                  <Input
                    inputMode="decimal"
                    value={depositAmount}
                    disabled={pending}
                    onChange={(event) => onDepositChange(event.target.value)}
                    placeholder="$0.00"
                    className="h-9 text-right tabular-nums"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {invoices.length > 0 ? (
          <UnpaidInvoices
            invoices={invoices}
            amounts={invoiceAmounts}
            disabled={pending}
            onAmountChange={setInvoiceAmount}
          />
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={addNote}
            disabled={pending}
            onChange={(event) => setAddNote(event.target.checked)}
          />
          {COPY.addNote}
        </label>
        {addNote ? (
          <Textarea
            value={note}
            disabled={pending}
            maxLength={TRUST_TRANSACTION_LIMITS.descriptionMax}
            onChange={(event) => setNote(event.target.value)}
            placeholder={COPY.notePlaceholder}
            rows={3}
          />
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending || !selected} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit(headerCents != null && headerCents > 0 ? formatCents(headerCents) : '$0.00')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-9 grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Amount and Date, on the same row as the matching fact on the left. */
function SideField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid h-9 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function UnpaidInvoices({
  invoices,
  amounts,
  disabled,
  onAmountChange,
}: {
  invoices: TrustTenantInvoice[];
  amounts: Record<string, string>;
  disabled: boolean;
  onAmountChange: (invoiceId: string, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{COPY.unpaidInvoices}</p>
      <ul className="divide-y rounded-lg border">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="flex items-start gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                #{invoice.invoiceNumber} · {invoice.details}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatCents(invoice.outstandingCents)} owing
                {invoice.dueDate ? ` · due ${formatTrustDate(invoice.dueDate)}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Input
                inputMode="decimal"
                value={amounts[invoice.id] ?? ''}
                disabled={disabled}
                onChange={(event) => onAmountChange(invoice.id, event.target.value)}
                placeholder="$0.00"
                className="h-9 w-28 text-right tabular-nums"
              />
              <button
                type="button"
                className="text-sky-700 text-xs"
                disabled={disabled}
                onClick={() => onAmountChange(invoice.id, centsToDollarsInput(invoice.outstandingCents))}
              >
                {COPY.payInFull}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The API's preview of a receipt, debounced; null until there is something to preview. */
function useReceiptPreview({
  agencyId,
  bankAccountId,
  ledgerId,
  date,
  rentCents,
  invoiceId,
  invoiceCents,
}: {
  agencyId: string;
  bankAccountId: string;
  ledgerId: string;
  date: string;
  rentCents: number | null;
  invoiceId: string | null;
  invoiceCents: number | null;
}): TrustReceiptPreview | null {
  const [result, setResult] = useState<{ key: string; data: TrustReceiptPreview | null } | null>(null);
  const rent = rentCents != null && rentCents > 0 ? rentCents : null;
  const paid = invoiceId && invoiceCents != null && invoiceCents > 0 ? invoiceCents : null;
  const key =
    ledgerId && date && (rent != null || paid != null)
      ? [ledgerId, date, rent ?? '', invoiceId ?? '', paid ?? ''].join('|')
      : null;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchTrustReceiptPreview(agencyId, bankAccountId, {
        ledgerId,
        receiptDate: date,
        rentCents: rent ?? undefined,
        invoiceId: paid != null ? (invoiceId ?? undefined) : undefined,
        invoiceCents: paid ?? undefined,
      })
        .then((data) => {
          if (!cancelled) setResult({ key, data });
        })
        .catch(() => {
          if (!cancelled) setResult({ key, data: null });
        });
    }, TRUST_PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, agencyId, bankAccountId, ledgerId, date, rent, invoiceId, paid]);

  return key && result?.key === key ? result.data : null;
}
