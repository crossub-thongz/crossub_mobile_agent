'use client';

import { CreditCard, FileText, Loader2, Lock, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { PageIntro } from '@/components/agent/page-intro';
import { AgencyIncludedUsageByProperty } from '@/components/billing/included-allowance-usage';
import { JobCaseReferenceLink } from '@/components/billing/job-case-reference-link';
import {
  PlatformChargeDetailDialog,
  type PlatformChargeDetailDialogState,
} from '@/components/billing/platform-charge-detail-dialog';
import {
  Level2MonthlyBillingList,
  buildLevel2MonthGroups,
  daysUntilAccountLock,
  formatAccountLockCountdown,
} from '@/components/billing/level2-monthly-billing';
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
import { finalizeBillingChargePayment } from '@/lib/billing/finalize-billing-payment';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import {
  confirmAgentPaymentMethodSetup,
  createAgentPaymentMethodSetup,
  fetchAgentBillingPricing,
  fetchAgentBillingSummary,
  fetchAgentMonthlyInvoice,
  listAgentChargeHistory,
  listAgentInvoiceHistory,
  payAllAgentBilling,
  type AgentBillingCharge,
  type AgentBillingIncludedUsageRow,
  type AgentBillingMonthlyInvoice,
  type AgentBillingSummary,
} from '@/lib/crossub-api/agent-billing-client';
import { getStripePublishableKey } from '@/lib/stripe-client';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

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
  refunded: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  void: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  sent: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  overdue: 'border-destructive/30 bg-destructive/10 text-destructive',
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return formatDate(iso);
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

function chargeOpensInvoice(row: AgentBillingCharge): boolean {
  return Boolean(row.monthlyInvoiceId) || row.status === 'invoiced';
}

export default function BillPage() {
  const [summary, setSummary] = useState<AgentBillingSummary | null>(null);
  const [charges, setCharges] = useState<AgentBillingCharge[]>([]);
  const [invoices, setInvoices] = useState<AgentBillingMonthlyInvoice[]>([]);
  const [includedUsageByProperty, setIncludedUsageByProperty] = useState<
    AgentBillingIncludedUsageRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const [chargeDialog, setChargeDialog] = useState<PlatformChargeDetailDialogState>(null);
  const [invoiceDialog, setInvoiceDialog] = useState<PlatformMonthlyInvoiceDialogState>(null);
  const [setupDialog, setSetupDialog] = useState<StripeSetupDialogState | null>(null);
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false);

  const stripeConfigured = Boolean(getStripePublishableKey());
  const isLevel2 = summary?.portalServiceLevel === 'LEVEL_2_FULL_MANAGEMENT';

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
      const [billing, chargeRows, invoiceRows, pricing] = await Promise.all([
        fetchAgentBillingSummary(),
        listAgentChargeHistory(),
        listAgentInvoiceHistory(),
        fetchAgentBillingPricing().catch(() => null),
      ]);
      setSummary(billing);
      setCharges(chargeRows);
      setInvoices(invoiceRows);
      setIncludedUsageByProperty(pricing?.level2.includedUsageByProperty ?? []);
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

  /** Level 1 keeps a flat prepaid + invoice list; Level 2 uses month groups. */
  const payments = useMemo(() => {
    if (isLevel2) return [] as PaymentRow[];
    const rows: PaymentRow[] = [
      ...charges.map((row) => ({
        kind: 'charge' as const,
        id: `charge-${row.id}`,
        sortAt: row.createdAt,
        row,
      })),
      ...invoices.map((row) => ({
        kind: 'invoice' as const,
        id: `invoice-${row.id}`,
        sortAt: row.periodEnd,
        row,
      })),
    ];
    return rows.sort(
      (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
    );
  }, [charges, invoices, isLevel2]);

  const level2MonthGroups = useMemo(
    () =>
      isLevel2
        ? buildLevel2MonthGroups(charges, invoices, {
            overdueLockDays: summary?.overdueLockDays ?? 7,
          })
        : [],
    [charges, invoices, isLevel2, summary?.overdueLockDays],
  );

  const openInvoiceLockDays = useMemo(() => {
    if (!isLevel2 || summary?.billingBlocked || !summary?.nextInvoiceDueDate) return null;
    return daysUntilAccountLock(
      summary.nextInvoiceDueDate,
      summary.overdueLockDays ?? 7,
    );
  }, [
    isLevel2,
    summary?.billingBlocked,
    summary?.nextInvoiceDueDate,
    summary?.overdueLockDays,
  ]);

  const hasBillingRows = isLevel2 ? level2MonthGroups.length > 0 : payments.length > 0;
  const outstandingCountDisplay = outstandingCount;

  const openInvoiceById = async (invoiceId: string) => {
    const existing = invoices.find((row) => row.id === invoiceId);
    if (existing) {
      setInvoiceDialog({
        invoice: existing,
        defaultPaymentMethod: summary?.defaultPaymentMethod,
      });
      return;
    }

    setOpeningInvoiceId(invoiceId);
    try {
      const detail = await fetchAgentMonthlyInvoice(invoiceId);
      setInvoiceDialog({
        invoice: {
          id: detail.id,
          invoiceNumber: detail.invoiceNumber,
          periodStart: detail.periodStart,
          periodEnd: detail.periodEnd,
          dueDate: detail.dueDate,
          status: detail.status,
          amountDue: detail.amountDue,
          paidAt: detail.paidAt,
        },
        defaultPaymentMethod: summary?.defaultPaymentMethod,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load invoice');
    } finally {
      setOpeningInvoiceId(null);
    }
  };

  const handlePaymentSuccess = async (chargeId?: string | null) => {
    await finalizeBillingChargePayment(chargeId);
    toast.success('Payment complete');
    await load();
  };

  const handlePaymentMethodSuccess = async () => {
    toast.success('Default payment method saved');
    const billing = await fetchAgentBillingSummary();
    setSummary(billing);
    setPaymentDialog((prev) =>
      prev
        ? {
            ...prev,
            defaultPaymentMethod: billing.defaultPaymentMethod ?? null,
            preferSavedCard: true,
          }
        : null,
    );
  };

  const startAddPaymentMethod = async (mode: 'add' | 'update' = 'add') => {
    if (!stripeConfigured) {
      toast.error('Card payments are not configured on this environment.');
      return;
    }

    setSavingPaymentMethod(true);
    try {
      const { clientSecret } = await createAgentPaymentMethodSetup();
      setSetupDialog({ clientSecret, mode });
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
          defaultPaymentMethod: summary?.defaultPaymentMethod,
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

  return (
    <AgentShell title={isLevel2 ? 'Invoice' : 'Bills'}>
      <div className="space-y-5">
        <PageIntro
          title={isLevel2 ? 'Invoice' : 'Bills'}
          description={
            isLevel2
              ? 'Monthly service invoices for your agency. Accrued inspection fees are not charged if no inspector confirms within 48 hours.'
              : 'Prepaid service charges for your agency. Unaccepted jobs are refunded after 48 hours.'
          }
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
                onClick={() => void startAddPaymentMethod(summary?.defaultPaymentMethod ? 'update' : 'add')}
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
            {isLevel2 && openInvoiceLockDays != null ? (
              <p
                className={cn(
                  'mt-2 text-sm font-medium',
                  openInvoiceLockDays <= 3
                    ? 'text-destructive'
                    : 'text-amber-800 dark:text-amber-200',
                )}
              >
                {formatAccountLockCountdown(openInvoiceLockDays)}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.openInvoiceId ? (
                <Button
                  type="button"
                  variant={showPayAll ? 'outline' : 'default'}
                  className="w-full sm:w-auto"
                  onClick={() => void openInvoiceById(summary.openInvoiceId!)}
                  disabled={
                    openingInvoiceId != null ||
                    paymentDialog != null ||
                    invoiceDialog != null ||
                    payingAll
                  }
                >
                  {openingInvoiceId === summary.openInvoiceId ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                  View invoice
                </Button>
              ) : null}
              {showPayAll ? (
                <Button
                  className="w-full sm:w-auto"
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
          </div>
        ) : null}

        {isLevel2 ? (
          <AgencyIncludedUsageByProperty rows={includedUsageByProperty} />
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {isLevel2 ? 'Monthly invoices' : 'All payments'}
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
        ) : !hasBillingRows ? (
          <EmptyState
            title="No payments yet"
            description={
              isLevel2
                ? 'Service charges and monthly invoices will appear here grouped by month.'
                : 'Prepaid inspections, tribunal sessions, and monthly service invoices will appear here.'
            }
          />
        ) : isLevel2 ? (
          <Level2MonthlyBillingList
            charges={charges}
            invoices={invoices}
            overdueLockDays={summary?.overdueLockDays ?? 7}
            billingBlocked={summary?.billingBlocked === true}
            openingInvoiceId={openingInvoiceId}
            disabled={
              paymentDialog != null ||
              chargeDialog != null ||
              invoiceDialog != null ||
              payingAll ||
              payingKey != null
            }
            onViewInvoice={(invoice) =>
              setInvoiceDialog({
                invoice,
                defaultPaymentMethod: summary?.defaultPaymentMethod,
              })
            }
            onOpenInvoiceById={(invoiceId) => void openInvoiceById(invoiceId)}
            onViewCharge={(row) =>
              setChargeDialog({
                charge: row,
                defaultPaymentMethod: summary?.defaultPaymentMethod,
              })
            }
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {payments.map((entry) => {
              if (entry.kind === 'charge') {
                const row = entry.row;
                const payable = isPayableCharge(row);
                const opensInvoice = chargeOpensInvoice(row);
                const invoiceId = row.monthlyInvoiceId ?? null;
                const viewLabel = opensInvoice ? 'View invoice' : 'View bill';
                return (
                  <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            row.status === 'void' || row.status === 'refunded'
                              ? 'text-muted-foreground line-through'
                              : null,
                          )}
                        >
                          {serviceLabel(row.serviceType)}
                        </p>
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
                            STATUS_TONE[row.status] ?? 'border-border text-muted-foreground',
                          )}
                        >
                          {row.status === 'void' ? 'Not charged' : row.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-muted-foreground text-[11px] uppercase">
                          {row.collectionMode}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-muted-foreground mt-1 text-sm',
                          (row.status === 'void' || row.status === 'refunded') && 'line-through',
                        )}
                      >
                        {row.description}
                      </p>
                      {row.jobCaseName ? (
                        <p className="mt-1 text-sm">
                          <JobCaseReferenceLink
                            charge={row}
                            className={
                              row.status === 'void' || row.status === 'refunded'
                                ? 'text-muted-foreground line-through'
                                : undefined
                            }
                          />
                        </p>
                      ) : null}
                      {row.calculationDetail ? (
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          {row.calculationDetail}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {[
                          row.createdByName ? `Created by ${row.createdByName}` : null,
                          `Created ${formatDateTime(row.createdAt)}`,
                          row.paidAt ? `Paid ${formatDateTime(row.paidAt)}` : null,
                          row.refundedAt ? `Refunded ${formatDateTime(row.refundedAt)}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          (row.status === 'void' || row.status === 'refunded') &&
                            'text-muted-foreground line-through',
                        )}
                      >
                        {formatCurrency(row.amount)}
                      </p>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant={payable ? 'default' : 'outline'}
                          onClick={() => {
                            if (opensInvoice && invoiceId) {
                              void openInvoiceById(invoiceId);
                              return;
                            }
                            setChargeDialog({
                              charge: row,
                              defaultPaymentMethod: summary?.defaultPaymentMethod,
                            });
                          }}
                          disabled={
                            paymentDialog != null ||
                            chargeDialog != null ||
                            invoiceDialog != null ||
                            openingInvoiceId != null
                          }
                        >
                          {openingInvoiceId && invoiceId && openingInvoiceId === invoiceId ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : opensInvoice ? (
                            <FileText className="size-3.5" />
                          ) : payable ? (
                            <CreditCard className="size-3.5" />
                          ) : null}
                          {viewLabel}
                        </Button>
                      </div>
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
                      {row.paidAt ? ` · paid ${formatDateTime(row.paidAt)}` : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(row.amountDue)}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant={payable ? 'default' : 'outline'}
                        onClick={() =>
                          setInvoiceDialog({
                            invoice: row,
                            defaultPaymentMethod: summary?.defaultPaymentMethod,
                          })
                        }
                        disabled={
                          paymentDialog != null ||
                          invoiceDialog != null ||
                          openingInvoiceId != null
                        }
                      >
                        {payable ? <CreditCard className="size-3.5" /> : <FileText className="size-3.5" />}
                        View invoice
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <PlatformChargeDetailDialog
        state={chargeDialog}
        onOpenChange={(open) => {
          if (!open) setChargeDialog(null);
        }}
        onPaid={handlePaymentSuccess}
        paymentDialog={paymentDialog}
        setPaymentDialog={setPaymentDialog}
      />

      <StripePaymentDialog
        state={paymentDialog}
        open={paymentDialog != null && setupDialog == null}
        onOpenChange={(open) => {
          if (!open) setPaymentDialog(null);
        }}
        onChangePaymentMethod={() =>
          void startAddPaymentMethod(paymentDialog?.defaultPaymentMethod ? 'update' : 'add')
        }
        onSuccess={async () => {
          const chargeId = paymentDialog?.chargeId;
          setChargeDialog(null);
          setInvoiceDialog(null);
          await handlePaymentSuccess(chargeId);
        }}
      />

      <PlatformMonthlyInvoiceDialog
        state={invoiceDialog}
        onOpenChange={(open) => {
          if (!open) setInvoiceDialog(null);
        }}
        onPaid={handlePaymentSuccess}
        paymentDialog={paymentDialog}
        setPaymentDialog={setPaymentDialog}
      />

      <StripeSetupDialog
        state={setupDialog}
        onOpenChange={(open) => {
          if (!open) setSetupDialog(null);
        }}
        onSuccess={async () => {
          await handlePaymentMethodSuccess();
          await load();
        }}
      />
    </AgentShell>
  );
}
