'use client';

import { CreditCard, Info, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { resolvePaymentFlow } from '@/lib/billing/resolve-payment-flow';
import type { StripePaymentDialogState } from '@/components/billing/stripe-payment-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchAgentMonthlyInvoice,
  payAgentMonthlyInvoice,
  type AgentBillingDefaultPaymentMethod,
  type AgentBillingMonthlyInvoice,
  type AgentBillingMonthlyInvoiceDetail,
} from '@/lib/crossub-api/agent-billing-client';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Full Service fee',
  letting_fee: 'Letting fee',
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeZone: 'Australia/Sydney',
  }).format(new Date(iso));
}

function serviceLabel(raw: string): string {
  return SERVICE_LABEL[raw] ?? raw.replace(/_/g, ' ');
}

/** "2 CROSSUB Demo Street (L2A), Haymarket Routine inspection" */
function invoiceLineTitle(serviceType: string, description: string): string {
  const service = serviceLabel(serviceType);
  const marker = ' — ';
  const idx = description.indexOf(marker);
  if (idx === -1) return service;
  const property = description.slice(idx + marker.length).trim();
  return property ? `${property} ${service}` : service;
}

export type PlatformMonthlyInvoiceDialogState = {
  invoice: AgentBillingMonthlyInvoice;
  defaultPaymentMethod?: AgentBillingDefaultPaymentMethod | null;
} | null;

type PlatformMonthlyInvoiceDialogProps = {
  state: PlatformMonthlyInvoiceDialogState;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void | Promise<void>;
  paymentDialog: StripePaymentDialogState | null;
  setPaymentDialog: (state: StripePaymentDialogState | null) => void;
};

export function PlatformMonthlyInvoiceDialog({
  state,
  onOpenChange,
  onPaid,
  paymentDialog,
  setPaymentDialog,
}: PlatformMonthlyInvoiceDialogProps) {
  const [detail, setDetail] = useState<AgentBillingMonthlyInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const invoiceId = state?.invoice.id;

  useEffect(() => {
    if (!invoiceId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchAgentMonthlyInvoice(invoiceId)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load invoice');
          onOpenChange(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId, onOpenChange]);

  const lineTotal = useMemo(
    () => (detail?.lineItems ?? []).reduce((sum, row) => sum + row.amount, 0),
    [detail?.lineItems],
  );

  const invoice = state?.invoice;
  const showFeeBreakdown =
    (detail?.serviceChargesSubtotal ?? 0) > 0 || (detail?.serviceFeeAmount ?? 0) > 0;
  const payable = detail?.status === 'sent' || detail?.status === 'overdue';

  const pay = async () => {
    if (!invoice || !payable) return;
    setPaying(true);
    try {
      const result = await payAgentMonthlyInvoice(invoice.id, { devConfirm: false });
      const outcome = resolvePaymentFlow(
        result,
        {
          title: 'Monthly platform invoice',
          description: invoice.invoiceNumber,
          amountAud: invoice.amountDue,
          calculationDetail: detail
            ? [
                (detail.serviceChargesSubtotal ?? 0) > 0
                  ? `Inspection & tribunal lines $${(detail.serviceChargesSubtotal ?? 0).toFixed(2)}`
                  : null,
                (detail.serviceFeeAmount ?? 0) > 0
                  ? `Full Service fee $${(detail.serviceFeeAmount ?? 0).toFixed(2)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' + ') || detail.calculationSummary
            : null,
          calculationSummary: detail?.calculationSummary,
          defaultPaymentMethod: state?.defaultPaymentMethod,
        },
        setPaymentDialog,
      );

      if (outcome === 'complete') {
        toast.success('Invoice paid');
        await onPaid();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog
      open={state != null && paymentDialog == null}
      onOpenChange={(open) => {
        if (!open && paymentDialog != null) return;
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" elevated>
        <DialogHeader>
          <DialogTitle>Monthly platform invoice</DialogTitle>
          <DialogDescription>
            {invoice?.invoiceNumber ?? 'Invoice'} · {formatWhen(invoice?.periodStart)} –{' '}
            {formatWhen(invoice?.periodEnd)}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2.5 rounded-2xl border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                    detail.status === 'paid'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : detail.status === 'overdue'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
                  )}
                >
                  {detail.status}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Billing period</span>
                <span className="font-medium">
                  {formatWhen(detail.periodStart)} – {formatWhen(detail.periodEnd)}
                </span>
              </div>
              {detail.dueDate ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Due</span>
                  <span className="font-medium">{formatWhen(detail.dueDate)}</span>
                </div>
              ) : null}
              {detail.paidAt ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium">{formatWhen(detail.paidAt)}</span>
                </div>
              ) : null}
            </div>

            {detail.calculationSummary ? (
              <div className="flex gap-3 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5 text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
                <div>
                  <p className="font-medium">How this invoice is calculated</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {detail.calculationSummary}
                  </p>
                </div>
              </div>
            ) : null}

            {showFeeBreakdown ? (
              <div className="rounded-xl border bg-card p-4 text-sm">
                <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  Invoice breakdown
                </p>
                <div className="space-y-1.5">
                  {(detail.serviceChargesSubtotal ?? 0) > 0 ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Inspection & tribunal charges</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(detail.serviceChargesSubtotal ?? 0)}
                      </span>
                    </div>
                  ) : null}
                  {(detail.serviceFeeAmount ?? 0) > 0 ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        Full Service fee
                        {detail.serviceFeePercent != null
                          ? ` (${detail.serviceFeePercent}% of management income)`
                          : null}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(detail.serviceFeeAmount ?? 0)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3 border-t pt-2 font-semibold">
                    <span>{detail.status === 'paid' ? 'Total paid' : 'Total due'}</span>
                    <span className="tabular-nums">
                      {formatCurrency(detail.status === 'paid' ? lineTotal : detail.amountDue)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Line items
              </p>
              {detail.lineItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">No line items recorded on this invoice.</p>
              ) : (
                <ul className="divide-y overflow-hidden rounded-xl border">
                  {detail.lineItems.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-muted/20">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {invoiceLineTitle(row.serviceType, row.description)}
                        </p>
                        {row.serviceType === 'service_fee' && row.description ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">{row.description}</p>
                        ) : null}
                        {row.calculationDetail ? (
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            {row.calculationDetail}
                          </p>
                        ) : null}
                        {row.createdByName || row.createdAt ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {[
                              row.createdByName ? `Created by ${row.createdByName}` : null,
                              row.createdAt ? `Created ${formatDateTime(row.createdAt)}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCurrency(row.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!showFeeBreakdown ? (
              <div
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3',
                  detail.status === 'paid'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-border bg-card',
                )}
              >
                <span className="text-sm font-medium">
                  {detail.status === 'paid' ? 'Amount paid' : 'Amount due'}
                </span>
                <span className="text-lg font-semibold tabular-nums tracking-tight">
                  {formatCurrency(detail.status === 'paid' ? lineTotal : detail.amountDue)}
                </span>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {payable && detail ? (
            <Button
              type="button"
              onClick={() => void pay()}
              disabled={paying || paymentDialog != null}
            >
              {paying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CreditCard className="size-4" />
              )}
              Pay {formatCurrency(detail.amountDue)}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
