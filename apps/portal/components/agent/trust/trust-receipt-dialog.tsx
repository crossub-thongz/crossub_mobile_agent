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
  type TrustPaymentMethod,
  type TrustReceiptAllocationKind,
} from '@/constants/trust';
import {
  TRUST_PREVIEW_DEBOUNCE_MS,
  TRUST_RECEIPT_INVOICE_COPY as INVOICE_COPY,
  TRUST_RECEIPT_KINDS_WITH_INVOICE,
} from '@/constants/trust-invoices';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  postTrustTenantReceipt,
  type TrustRentRow,
} from '@/lib/crossub-api/agent-trust-client';
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

/**
 * Receipt rent, a deposit or one open invoice from a tenant ledger, with a preview of the paid-to
 * date and the fees it would charge. Mount it per open, keyed by the row.
 */
export function TrustReceiptDialog({
  agencyId,
  bankAccountId,
  row,
  onClose,
  onReceipted,
}: {
  agencyId: string;
  bankAccountId: string;
  row: TrustRentRow;
  onClose: () => void;
  onReceipted: () => void;
}) {
  const [kind, setKind] = useState<TrustReceiptAllocationKind>(TRUST_RECEIPT_ALLOCATION_KIND.RENT);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(trustTodayKey);
  const [method, setMethod] = useState<TrustPaymentMethod>(TRUST_PAYMENT_METHOD.EFT);
  const [reference, setReference] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [idempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);

  const isInvoice = kind === TRUST_RECEIPT_ALLOCATION_KIND.INVOICE;
  const openInvoices = useTrustResource(isInvoice ? `${agencyId}:${row.ledgerId}` : null, () =>
    fetchTrustOpenInvoices(agencyId, row.ledgerId),
  );
  const invoice = openInvoices.data?.find((open) => open.id === invoiceId) ?? null;
  const amountCents = parseDollarsToCents(amount);
  const preview = useReceiptPreview({
    agencyId,
    bankAccountId,
    ledgerId: row.ledgerId,
    date,
    rentCents: kind === TRUST_RECEIPT_ALLOCATION_KIND.RENT && row.hasRentProfile ? amountCents : null,
    invoiceId: isInvoice ? invoice?.id ?? null : null,
    invoiceCents: isInvoice ? amountCents : null,
  });

  async function onSubmit() {
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
        ledgerId: row.ledgerId,
        effectiveDate: date,
        method,
        allocations: [{ kind, amountCents, invoiceId: invoice?.id }],
        reference: reference.trim() || undefined,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.title}</DialogTitle>
          <DialogDescription>{COPY.description(row.ledgerName)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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
                  if (picked) setAmount(centsToDollarsInput(picked.outstandingCents));
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
                disabled={pending}
                onChange={(e) => setAmount(e.target.value)}
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
                disabled={pending}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
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
  const key = date && (rent != null || paid != null) ? [ledgerId, date, rent ?? '', invoiceId ?? '', paid ?? ''].join('|') : null;

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
