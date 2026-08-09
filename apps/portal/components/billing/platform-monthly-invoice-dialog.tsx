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
import { cn, formatCurrency } from '@/lib/utils';

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Full Service fee',
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(iso));
}

function serviceLabel(raw: string): string {
  return SERVICE_LABEL[raw] ?? raw.replace(/_/g, ' ');
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
    <Dialog open={state != null} onOpenChange={onOpenChange}>
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
            <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{detail.status}</span>
              </div>
              {detail.periodToken ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Billing period</span>
                  <span className="font-medium">{detail.periodToken}</span>
                </div>
              ) : null}
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
              <div className="flex gap-3 rounded-lg border border-sky-500/25 bg-sky-500/5 p-3 text-sm">
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
              <div className="rounded-lg border bg-card p-3 text-sm">
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
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
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Line items
              </p>
              {detail.lineItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">No line items recorded on this invoice.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {detail.lineItems.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{serviceLabel(row.serviceType)}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">{row.description}</p>
                        {row.calculationDetail ? (
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            {row.calculationDetail}
                          </p>
                        ) : null}
                        {row.createdByName ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            Created by {row.createdByName}
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
                  'flex items-center justify-between rounded-lg border px-3 py-2',
                  detail.status === 'paid'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-border bg-card',
                )}
              >
                <span className="text-sm font-medium">
                  {detail.status === 'paid' ? 'Amount paid' : 'Amount due'}
                </span>
                <span className="text-base font-semibold tabular-nums">
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
