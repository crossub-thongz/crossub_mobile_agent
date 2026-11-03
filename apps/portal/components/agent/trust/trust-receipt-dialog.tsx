'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
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
import {
  TRUST_PAYMENT_METHOD,
  TRUST_PAYMENT_METHOD_LABEL,
  TRUST_PAYMENT_METHODS,
  TRUST_RECEIPT_ALLOCATION_KIND,
  TRUST_RECEIPT_COPY as COPY,
  TRUST_RECEIPT_RENT_PERIOD_LABEL,
  type TrustPaymentMethod,
  type TrustReceiptAllocationKind,
  type TrustRentPeriod,
} from '@/constants/trust';
import {
  TRUST_PREVIEW_DEBOUNCE_MS,
  TRUST_RECEIPT_INVOICE_COPY as INVOICE_COPY,
  TRUST_RECEIPT_KINDS_WITH_INVOICE,
} from '@/constants/trust-invoices';
import { useDebouncedValue, useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustLedger,
  postTrustTenantReceipt,
  type TrustBankLineInput,
} from '@/lib/crossub-api/agent-trust-client';
import {
  filterReceiptTenancies,
  loadReceiptTenancies,
  toReceiptTenancy,
  type ReceiptTenancy,
} from '@/lib/trust-tenancy-search';
import {
  fetchTrustOpenInvoices,
  fetchTrustReceiptPreview,
  type TrustReceiptPreview,
} from '@/lib/crossub-api/agent-trust-invoices-client';
import {
  centsToDollarsInput,
  formatCents,
  formatTrustDate,
  newTrustIdempotencyKey,
  parseDollarsToCents,
  trustTodayKey,
} from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

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

function rentAmountLabel(cents: number | null | undefined, period: string | null | undefined): string {
  if (cents == null || !period) return '—';
  const per = TRUST_RECEIPT_RENT_PERIOD_LABEL[period as TrustRentPeriod];
  return per ? `${formatCents(cents)} ${per}` : formatCents(cents);
}

/**
 * Receipt rent, a deposit or one open invoice from a tenant ledger, with the tenancy's address,
 * rent and current paid-to. A bank-line open locks the amount to that line. Mount it per open.
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
  const [kind, setKind] = useState<TrustReceiptAllocationKind>(TRUST_RECEIPT_ALLOCATION_KIND.RENT);
  const [amount, setAmount] = useState(() => (amountLocked ? centsToDollarsInput(lockedAmountCents) : ''));
  const [date, setDate] = useState(bankLine?.lineDate ?? trustTodayKey);
  const [method, setMethod] = useState<TrustPaymentMethod>(TRUST_PAYMENT_METHOD.EFT);
  const [reference, setReference] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [idempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim());

  const tenancies = useTrustResource(`${agencyId}:${bankAccountId}:receipt-tenancies`, () =>
    loadReceiptTenancies(agencyId, bankAccountId),
  );
  const matches = filterReceiptTenancies(tenancies.data ?? [], debouncedQuery);

  const ledger = useTrustResource(selected ? `${agencyId}:${selected.ledgerId}:receipt` : null, () =>
    fetchTrustLedger(agencyId, selected!.ledgerId),
  );
  const profile = ledger.data?.rentProfile ?? null;
  const propertyAddress =
    ledger.data?.propertyAddress ||
    selected?.propertyAddress ||
    ledger.data?.propertyReferenceAddress ||
    selected?.propertyReferenceAddress ||
    '—';
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
  const rentLabel = rentAmountLabel(
    profile?.rentAmountCents ?? selected?.rentAmountCents,
    profile?.rentPeriod ?? selected?.rentPeriod,
  );
  const hasRentProfile = profile != null || Boolean(selected?.hasRentProfile);

  const isInvoice = kind === TRUST_RECEIPT_ALLOCATION_KIND.INVOICE;
  const openInvoices = useTrustResource(isInvoice && selected ? `${agencyId}:${selected.ledgerId}` : null, () =>
    fetchTrustOpenInvoices(agencyId, selected!.ledgerId),
  );
  const invoice = openInvoices.data?.find((open) => open.id === invoiceId) ?? null;
  const amountCents = parseDollarsToCents(amount);
  const preview = useReceiptPreview({
    agencyId,
    bankAccountId,
    ledgerId: selected?.ledgerId ?? '',
    date,
    rentCents: kind === TRUST_RECEIPT_ALLOCATION_KIND.RENT && hasRentProfile ? amountCents : null,
    invoiceId: isInvoice ? invoice?.id ?? null : null,
    invoiceCents: isInvoice ? amountCents : null,
  });

  function chooseTenancy(tenancy: ReceiptTenancy) {
    setSelected(tenancy);
    setQuery('');
    setInvoiceId('');
  }

  async function onSubmit() {
    if (!selected) {
      toast.error(COPY.pickTenant);
      return;
    }
    if (amountCents == null || amountCents <= 0) {
      toast.error(COPY.amountInvalid);
      return;
    }
    if (!date) {
      toast.error(COPY.dateRequired);
      return;
    }
    if (isInvoice && !invoice) {
      toast.error(INVOICE_COPY.invoiceRequired);
      return;
    }
    if (invoice && amountCents > invoice.outstandingCents) {
      toast.error(INVOICE_COPY.overOutstanding(formatCents(invoice.outstandingCents)));
      return;
    }
    setPending(true);
    try {
      const tx = await postTrustTenantReceipt(agencyId, bankAccountId, {
        idempotencyKey,
        ledgerId: selected.ledgerId,
        effectiveDate: date,
        method,
        allocations: [{ kind, amountCents, invoiceId: invoice?.id }],
        reference: reference.trim() || undefined,
        ...(bankLine ? { bankLine } : {}),
      });
      toast.success(COPY.done(tx.receiptNumber));
      onReceipted();
      onClose();
    } catch (err) {
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
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        onPointerDownOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{COPY.title}</DialogTitle>
          <DialogDescription>
            {selected ? COPY.description(selected.ledgerName) : COPY.searchDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-receipt-tenant">{COPY.tenant}</Label>
            {selected ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selected.ledgerName}</p>
                  <p className="text-muted-foreground font-mono text-xs">{selected.ledgerCode}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setSelected(null);
                    setInvoiceId('');
                  }}
                >
                  {COPY.changeTenant}
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="trust-receipt-tenant"
                  value={query}
                  disabled={pending}
                  placeholder={COPY.tenantSearch}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {debouncedQuery ? (
                  <div className="max-h-48 overflow-y-auto rounded-lg border">
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
                                {tenancy.ledgerName}{' '}
                                <span className="text-muted-foreground font-mono text-xs">{tenancy.ledgerCode}</span>
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {tenancy.propertyAddress || tenancy.propertyReferenceAddress || '—'}
                                {tenancy.paymentReference ? ` · ${tenancy.paymentReference}` : ''}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
          {selected ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="grid grid-cols-[7rem_1fr] gap-2">
                <dt className="text-muted-foreground">{COPY.property}</dt>
                <dd>{propertyAddress}</dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-2">
                <dt className="text-muted-foreground">{COPY.rent}</dt>
                <dd className="tabular-nums">{rentLabel}</dd>
              </div>
            </dl>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="trust-receipt-kind">{COPY.kind}</Label>
            <select
              id="trust-receipt-kind"
              className={SELECT_CLASS}
              value={kind}
              disabled={pending}
              onChange={(e) => {
                setKind(e.target.value as TrustReceiptAllocationKind);
                setInvoiceId('');
              }}
            >
              {TRUST_RECEIPT_KINDS_WITH_INVOICE.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {isInvoice ? (
            <div className="space-y-1.5">
              <Label htmlFor="trust-receipt-invoice">{INVOICE_COPY.invoice}</Label>
              <select
                id="trust-receipt-invoice"
                className={SELECT_CLASS}
                value={invoiceId}
                disabled={pending || openInvoices.loading}
                onChange={(e) => {
                  const picked = openInvoices.data?.find((open) => open.id === e.target.value);
                  setInvoiceId(e.target.value);
                  if (picked && !amountLocked) setAmount(centsToDollarsInput(picked.outstandingCents));
                }}
              >
                <option value="">{INVOICE_COPY.chooseInvoice}</option>
                {openInvoices.data?.map((open) => (
                  <option key={open.id} value={open.id}>
                    {INVOICE_COPY.option(open.invoiceNumber, open.details, formatCents(open.outstandingCents))}
                  </option>
                ))}
              </select>
              {openInvoices.error ? (
                <p className="text-destructive text-xs">{apiErrorMessage(openInvoices.error)}</p>
              ) : openInvoices.data && openInvoices.data.length === 0 ? (
                <p className="text-muted-foreground text-xs">{INVOICE_COPY.noOpenInvoices}</p>
              ) : null}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-receipt-amount">{COPY.amount}</Label>
              <Input
                id="trust-receipt-amount"
                inputMode="decimal"
                value={amount}
                disabled={pending || amountLocked}
                onChange={(e) => {
                  if (!amountLocked) setAmount(e.target.value);
                }}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-receipt-date">{COPY.date}</Label>
              <Input
                id="trust-receipt-date"
                type="date"
                value={date}
                max={trustTodayKey()}
                disabled={pending || bankLine != null}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          {selected ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{COPY.allocation}</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{COPY.allocation}</th>
                    <th className="px-3 py-2 text-left font-medium">{COPY.due}</th>
                    <th className="px-3 py-2 text-left font-medium">{COPY.allocationDescription}</th>
                    <th className="px-3 py-2 text-left font-medium">{COPY.amountDue}</th>
                    <th className="w-32 px-3 py-2 text-right font-medium">{COPY.allocationAmount}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 font-medium">{COPY.rentAllocation}</td>
                    <td className={overdueDays != null ? 'text-destructive px-3 py-2' : 'text-muted-foreground px-3 py-2'}>
                      {formatTrustDate(paidToDate)}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {paidToDate
                        ? COPY.paidToStatus(
                            formatPaidToSlash(paidToDate),
                            partPaymentCents != null && partPaymentCents > 0 ? formatCents(partPaymentCents) : null,
                          )
                        : '—'}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {overdueDays != null ? COPY.overdueDays(overdueDays) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        id="trust-receipt-allocation-amount"
                        inputMode="decimal"
                        value={amount}
                        disabled={pending || amountLocked}
                        onChange={(e) => {
                          if (!amountLocked) setAmount(e.target.value);
                        }}
                        placeholder="0.00"
                        className="h-9 text-right tabular-nums"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="trust-receipt-method">{COPY.method}</Label>
            <select
              id="trust-receipt-method"
              className={SELECT_CLASS}
              value={method}
              disabled={pending}
              onChange={(e) => setMethod(e.target.value as TrustPaymentMethod)}
            >
              {TRUST_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {TRUST_PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-receipt-reference">{COPY.reference}</Label>
            <Input
              id="trust-receipt-reference"
              value={reference}
              disabled={pending}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          {preview ? <ReceiptPreview preview={preview} /> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    ...preview.fees.map((fee) =>
      fee.willPost
        ? INVOICE_COPY.previewFee(fee.name, formatCents(fee.amountCents))
        : INVOICE_COPY.previewFeePending(fee.name, formatCents(fee.amountCents)),
    ),
    preview.pendingFeesToPost.count > 0
      ? INVOICE_COPY.previewPendingFees(preview.pendingFeesToPost.count, formatCents(preview.pendingFeesToPost.amountCents))
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
