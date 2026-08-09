'use client';

import { CreditCard, Loader2, Lock, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { PageIntro } from '@/components/agent/page-intro';
import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import {
  PlatformMonthlyInvoiceDialog,
  type PlatformMonthlyInvoiceDialogState,
} from '@/components/billing/platform-monthly-invoice-dialog';
import {
  StripeSetupDialog,
  type StripeSetupDialogState,
} from '@/components/billing/stripe-setup-dialog';
import { resolvePaymentFlow } from '@/lib/billing/resolve-payment-flow';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import {
  confirmAgentPaymentMethodSetup,
  createAgentPaymentMethodSetup,
  fetchAgentBillingSummary,
  listAgentChargeHistory,
  listAgentInvoiceHistory,
  payAgentBillingCharge,
  payAgentMonthlyInvoice,
  payAllAgentBilling,
  type AgentBillingCharge,
  type AgentBillingMonthlyInvoice,
  type AgentBillingSummary,
} from '@/lib/crossub-api/agent-billing-client';
import { getStripePublishableKey } from '@/lib/stripe-client';
import { cn, formatCurrency } from '@/lib/utils';

type PaymentRow =
  | { kind: 'charge'; id: string; sortAt: string; row: AgentBillingCharge }
  | { kind: 'invoice'; id: string; sortAt: string; row: AgentBillingMonthlyInvoice };

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Service fee',
};

const STATUS_TONE: Record<string, string> = {
  paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  awaiting_payment: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  accrued: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  invoiced: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  sent: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  overdue: 'border-destructive/30 bg-destructive/10 text-destructive',
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(iso));
}

function serviceLabel(raw: string): string {
  return SERVICE_LABEL[raw] ?? raw.replace(/_/g, ' ');
}

function isPayableCharge(row: AgentBillingCharge): boolean {
  return row.status === 'awaiting_payment';
}

function formatCardBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatCardExpiry(expMonth: number, expYear: number): string {
  return `${String(expMonth).padStart(2, '0')}/${String(expYear).slice(-2)}`;
}

function isPayableInvoice(row: AgentBillingMonthlyInvoice): boolean {
  return row.status === 'sent' || row.status === 'overdue';
}

export default function BillPage() {
  const [summary, setSummary] = useState<AgentBillingSummary | null>(null);
  const [charges, setCharges] = useState<AgentBillingCharge[]>([]);
  const [invoices, setInvoices] = useState<AgentBillingMonthlyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const [invoiceDialog, setInvoiceDialog] = useState<PlatformMonthlyInvoiceDialogState>(null);
  const [setupDialog, setSetupDialog] = useState<StripeSetupDialogState | null>(null);
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false);

  const stripeConfigured = Boolean(getStripePublishableKey());

  const payableCharges = useMemo(() => charges.filter(isPayableCharge), [charges]);
  const payableInvoices = useMemo(() => invoices.filter(isPayableInvoice), [invoices]);

  const outstandingTotal = useMemo(
    () =>
      payableCharges.reduce((sum, row) => sum + row.amount, 0) +
      payableInvoices.reduce((sum, row) => sum + row.amountDue, 0),
    [payableCharges, payableInvoices],
  );

  const outstandingCount = payableCharges.length + payableInvoices.length;
  const showPayAll = outstandingCount >= 2;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [billing, chargeRows, invoiceRows] = await Promise.all([
        fetchAgentBillingSummary(),
        listAgentChargeHistory(),
        listAgentInvoiceHistory(),
      ]);
      setSummary(billing);
      setCharges(chargeRows);
      setInvoices(invoiceRows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'return') return;

    toast.success('Payment received — updating your balance…');
    void load();
    window.history.replaceState({}, '', '/bill');
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setupIntentId = params.get('setup_intent');
    if (params.get('setup') !== 'return' || !setupIntentId) return;

    void (async () => {
      try {
        await confirmAgentPaymentMethodSetup(setupIntentId);
        toast.success('Default payment method saved');
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save payment method');
      } finally {
        window.history.replaceState({}, '', '/bill');
      }
    })();
  }, [load]);

  const payments = useMemo(() => {
    const rows: PaymentRow[] = [
      ...charges.map((row) => ({
        kind: 'charge' as const,
        id: `charge-${row.id}`,
        sortAt: row.paidAt ?? row.createdAt,
        row,
      })),
      ...invoices.map((row) => ({
        kind: 'invoice' as const,
        id: `invoice-${row.id}`,
        sortAt: row.paidAt ?? row.dueDate ?? row.periodEnd,
        row,
      })),
    ];
    return rows.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
  }, [charges, invoices]);

  const outstandingCountDisplay = outstandingCount;

  const handlePaymentSuccess = async () => {
    toast.success('Payment complete');
    await load();
    // Webhook may mark the charge paid a moment after Stripe confirms.
    window.setTimeout(() => void load(), 2000);
  };

  const handlePaymentMethodSuccess = async () => {
    toast.success('Default payment method saved');
    await load();
  };

  const startAddPaymentMethod = async () => {
    if (!stripeConfigured) {
      toast.error('Card payments are not configured on this environment.');
      return;
    }

    setSavingPaymentMethod(true);
    try {
      const { clientSecret } = await createAgentPaymentMethodSetup();
      setSetupDialog({ clientSecret });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start payment method setup');
    } finally {
      setSavingPaymentMethod(false);
    }
  };

  const payAll = async () => {
    setPayingAll(true);
    try {
      const result = await payAllAgentBilling({ devConfirm: false });
      const outcome = resolvePaymentFlow(
        result,
        {
          title: 'Pay all outstanding bills',
          description: `${outstandingCount} bill(s) · ${formatCurrency(result.totalAmountAud)}`,
          amountAud: result.totalAmountAud,
        },
        setPaymentDialog,
      );

      if (outcome === 'complete') {
        toast.success(
          `Paid ${result.paidChargeCount + result.paidInvoiceCount} bill(s) — ${formatCurrency(result.totalAmountAud)}`,
        );
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPayingAll(false);
    }
  };

  const payCharge = async (chargeId: string, row: AgentBillingCharge) => {
    setPayingKey(`charge-${chargeId}`);
    try {
      const result = await payAgentBillingCharge(chargeId, { devConfirm: false });
      const outcome = resolvePaymentFlow(
        result,
        {
          title: serviceLabel(row.serviceType),
          description: row.description,
          amountAud: row.amount,
        },
        setPaymentDialog,
      );

      if (outcome === 'complete') {
        toast.success('Payment complete');
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPayingKey(null);
    }
  };

  const payInvoice = async (invoiceId: string, row: AgentBillingMonthlyInvoice) => {
    setPayingKey(`invoice-${invoiceId}`);
    try {
      const result = await payAgentMonthlyInvoice(invoiceId, { devConfirm: false });
      const outcome = resolvePaymentFlow(
        result,
        {
          title: 'Monthly platform invoice',
          description: row.invoiceNumber,
          amountAud: row.amountDue,
        },
        setPaymentDialog,
      );

      if (outcome === 'complete') {
        toast.success('Invoice paid');
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPayingKey(null);
    }
  };

  return (
    <AgentShell title="Bill">
      <div className="space-y-5">
        <PageIntro
          title="CROSSUB SERVICES billing"
          description="Prepaid service charges and monthly service invoices for your agency."
        />

        {summary?.billingBlocked ? (
          <div className="flex gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4">
            <Lock className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Account locked — invoice overdue
              </p>
              <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">
                Pay your outstanding service invoice below to restore full access to the Agent
                app.
              </p>
            </div>
          </div>
        ) : null}

        {stripeConfigured ? (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Default payment method
                </p>
                {summary?.defaultPaymentMethod ? (
                  <>
                    <p className="mt-1 text-sm font-medium">
                      {formatCardBrand(summary.defaultPaymentMethod.brand)} ending in{' '}
                      {summary.defaultPaymentMethod.last4}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Expires{' '}
                      {formatCardExpiry(
                        summary.defaultPaymentMethod.expMonth,
                        summary.defaultPaymentMethod.expYear,
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm">
                    Save a card for faster checkout on platform bills.
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant={summary?.defaultPaymentMethod ? 'outline' : 'default'}
                size="sm"
                onClick={() => void startAddPaymentMethod()}
                disabled={
                  savingPaymentMethod ||
                  paymentDialog != null ||
                  setupDialog != null ||
                  payingKey != null ||
                  payingAll
                }
              >
                {savingPaymentMethod ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                {summary?.defaultPaymentMethod ? 'Update payment method' : 'Add payment method'}
              </Button>
            </div>
          </div>
        ) : null}

        {summary && (summary.outstandingInvoiceAmount > 0 || outstandingTotal > 0) ? (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Outstanding balance
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {formatCurrency(outstandingTotal || summary.outstandingInvoiceAmount)}
            </p>
            {summary.openInvoiceNumber ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.openInvoiceNumber}
                {summary.nextInvoiceDueDate
                  ? ` · due ${formatWhen(summary.nextInvoiceDueDate)}`
                  : null}
              </p>
            ) : null}
            {showPayAll ? (
              <Button
                className="mt-4 w-full sm:w-auto"
                onClick={() => void payAll()}
                disabled={payingAll || payingKey != null || paymentDialog != null}
              >
                {payingAll ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                Pay all ({outstandingCount} bills · {formatCurrency(outstandingTotal)})
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            All payments
            {outstandingCountDisplay > 0 ? (
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                {outstandingCountDisplay} awaiting payment
              </span>
            ) : null}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Prepaid inspections, tribunal sessions, and monthly service invoices will appear here."
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {payments.map((entry) => {
              if (entry.kind === 'charge') {
                const row = entry.row;
                const payable = isPayableCharge(row);
                return (
                  <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{serviceLabel(row.serviceType)}</p>
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
                            STATUS_TONE[row.status] ?? 'border-border text-muted-foreground',
                          )}
                        >
                          {row.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-muted-foreground text-[11px] uppercase">
                          {row.collectionMode}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">{row.description}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {row.paidAt
                          ? `Paid ${formatWhen(row.paidAt)}`
                          : `Created ${formatWhen(row.createdAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(row.amount)}
                      </p>
                      {payable ? (
                        <Button
                          size="sm"
                          onClick={() => void payCharge(row.id, row)}
                          disabled={payingKey === entry.id || paymentDialog != null}
                        >
                          {payingKey === entry.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="size-3.5" />
                          )}
                          Pay
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              }

              const row = entry.row;
              const payable = isPayableInvoice(row);
              return (
                <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">Monthly invoice</p>
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
                          STATUS_TONE[row.status] ?? 'border-border text-muted-foreground',
                        )}
                      >
                        {row.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{row.invoiceNumber}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatWhen(row.periodStart)} – {formatWhen(row.periodEnd)}
                      {row.dueDate ? ` · due ${formatWhen(row.dueDate)}` : null}
                      {row.paidAt ? ` · paid ${formatWhen(row.paidAt)}` : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(row.amountDue)}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInvoiceDialog({ invoice: row })}
                        disabled={paymentDialog != null}
                      >
                        View invoice
                      </Button>
                      {payable ? (
                        <Button
                          size="sm"
                          onClick={() => void payInvoice(row.id, row)}
                          disabled={payingKey === entry.id || paymentDialog != null}
                        >
                          {payingKey === entry.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="size-3.5" />
                          )}
                          Pay invoice
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(open) => {
          if (!open) setPaymentDialog(null);
        }}
        onSuccess={handlePaymentSuccess}
      />

      <PlatformMonthlyInvoiceDialog
        state={invoiceDialog}
        onOpenChange={(open) => {
          if (!open) setInvoiceDialog(null);
        }}
      />

      <StripeSetupDialog
        state={setupDialog}
        onOpenChange={(open) => {
          if (!open) setSetupDialog(null);
        }}
        onSuccess={handlePaymentMethodSuccess}
      />
    </AgentShell>
  );
}
