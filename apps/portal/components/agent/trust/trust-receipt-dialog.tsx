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
  const per = TRUST_RECEIPT_RENT_PERIOD_LABEL[period as TrustRentPeriod];
  return per ? `${formatCents(cents)} ${per}` : formatCents(cents);
}

function partyLabel(name: string, code: string): string {
  const who = name.trim();
  const ref = code.trim();
  if (who && ref) return `${who} (${ref})`;
  return who || ref || COPY.empty;
}

/**
 * A tenant receipt: pick the tenancy, then allocate the amount across rent, a deposit and any open
 * invoices. Rent shows the current paid-to. A bank-line open locks the amount to that line.
 * Mount it per open.
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
  const propertyAddress =
    ledger.data?.propertyAddress ||
    selected?.propertyAddress ||
    ledger.data?.propertyReferenceAddress ||
    selected?.propertyReferenceAddress ||
    '';
  const paidToDate = profile?.paidToDate ?? selected?.paidToDate ?? null;
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
  const rentLabel = rentDetailsLabel(
    profile?.rentAmountCents ?? selected?.rentAmountCents,
    profile?.rentPeriod ?? selected?.rentPeriod,
  );
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
  const totalCents =
    rentCents != null && depositCents != null && invoiceTotal != null
      ? amountLocked
        ? lockedAmountCents
        : rentCents + depositCents + invoiceTotal
      : null;
  const rentInput = amountLocked && rentCents != null ? centsToDollarsInput(rentCents) : rentAmount;
  // A QIF line fills Amount with that line. A receipt typed by hand stays blank until an allocation is entered.
  const amountDisplay = amountLocked
    ? formatCents(lockedAmountCents)
    : totalCents != null && totalCents > 0
      ? formatCents(totalCents)
      : '';

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

  function chooseTenancy(tenancy: ReceiptTenancy) {
    depositEdited.current = false;
    setSelected(tenancy);
    setQuery('');
    setInvoiceAmounts({});
  }

  function setInvoiceAmount(invoiceId: string, value: string) {
    setInvoiceAmounts((current) => ({ ...current, [invoiceId]: value }));
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
    if (rentCents == null || depositCents == null || !invoicesOk || totalCents == null) {
      toast.error(COPY.amountFormat);
      return;
    }
    if (totalCents <= 0) {
      toast.error(COPY.amountInvalid);
      return;
    }
    if (amountLocked && rentCents + depositCents + (invoiceTotal ?? 0) !== lockedAmountCents) {
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <dl className="space-y-3 text-sm">
            <Fact label={COPY.tenant}>
              {selected ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{partyLabel(selected.ledgerName, selected.ledgerCode)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    disabled={pending}
                    onClick={() => {
                      depositEdited.current = false;
                      setSelected(null);
                      setInvoiceAmounts({});
                      setDepositDetails('');
                    }}
                  >
                    {COPY.changeTenant}
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    value={query}
                    disabled={pending}
                    placeholder={COPY.tenantSearch}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {debouncedQuery ? (
                    <div className="max-h-40 overflow-y-auto rounded-lg border">
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
            <Fact label={COPY.owner}>{ownerLabel}</Fact>
            <Fact label={COPY.property}>{propertyAddress || COPY.empty}</Fact>
            <Fact label={COPY.details}>{selected ? rentLabel : COPY.empty}</Fact>
          </dl>

          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-muted-foreground text-sm">{COPY.amount}</span>
              <Input
                readOnly
                tabIndex={-1}
                value={amountDisplay}
                placeholder=""
                className="bg-muted h-9 text-right tabular-nums"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-muted-foreground text-sm">{COPY.date}</span>
              <Input
                type="date"
                value={date}
                max={trustTodayKey()}
                disabled={pending || bankLine != null}
                onChange={(event) => setDate(event.target.value)}
                className="h-9"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
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
          </div>
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
                <td className="text-muted-foreground px-3 py-2">
                  {paidToDate
                    ? COPY.paidToStatus(
                        formatPaidToSlash(paidToDate),
                        partPaymentCents != null && partPaymentCents > 0 ? formatCents(partPaymentCents) : null,
                      )
                    : COPY.empty}
                </td>
                <td className="text-muted-foreground px-3 py-2">
                  {overdueDays != null ? COPY.overdueDays(overdueDays) : null}
                </td>
                <td className="px-3 py-2">
                  <Input
                    inputMode="decimal"
                    value={rentInput}
                    disabled={pending || amountLocked}
                    onChange={(event) => {
                      if (!amountLocked) setRentAmount(event.target.value);
                    }}
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
                    onChange={(event) => setDepositAmount(event.target.value)}
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

        {preview ? <ReceiptPreview preview={preview} /> : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending || !selected} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit(totalCents != null && totalCents > 0 ? formatCents(totalCents) : '$0.00')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3">
      <dt className="text-muted-foreground pt-2">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
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

function ReceiptPreview({ preview }: { preview: TrustReceiptPreview }) {
  const lines = [
    preview.rent
      ? INVOICE_COPY.previewPaidTo(
          formatTrustDate(preview.rent.paidToAfter),
          formatTrustDate(preview.rent.effectivePaidToAfter),
        )
      : null,
    ...preview.fees.map((fee: { willPost?: boolean; name?: string; amountCents?: number }) =>
      fee.willPost
        ? INVOICE_COPY.previewFee(fee.name ?? '', formatCents(fee.amountCents))
        : INVOICE_COPY.previewFeePending(fee.name ?? '', formatCents(fee.amountCents)),
    ),
    preview.pendingFeesToPost.count > 0
      ? INVOICE_COPY.previewPendingFees(
          preview.pendingFeesToPost.count,
          formatCents(preview.pendingFeesToPost.amountCents),
        )
      : null,
    INVOICE_COPY.previewOwnerNet(formatCents(preview.ownerNetCents)),
  ].filter((line): line is string => line != null);
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-xs">
      <p className="font-medium">{INVOICE_COPY.previewTitle}</p>
      <ul className="text-muted-foreground mt-1 space-y-0.5">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
