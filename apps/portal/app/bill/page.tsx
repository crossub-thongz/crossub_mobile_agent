'use client';

import { CreditCard, FileText, Loader2, Lock, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
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
  groupChargesByProperty,
  monthKeyFromIso,
  monthLabel,
  PropertyIncludedSummary,
  propertyGroupKindLabel,
} from '@/components/billing/level2-monthly-billing';
import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import {
  PlatformMonthlyInvoiceDialog,
  type PlatformMonthlyInvoiceDialogState,
} from '@/components/billing/platform-monthly-invoice-dialog';
import { AgentPaymentHistoryList } from '@/components/billing/payment-history';
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
  isMonthlyInvoiceServiceType,
  isPrepaidInspectionServiceType,
  listAgentChargeHistory,
  listAgentInvoiceHistory,
  listAgentPaymentHistory,
  payAgentBillingCharge,
  payAgentMonthlyInvoice,
  payAllAgentBilling,
  type AgentBillingCharge,
  type AgentBillingIncludedUsageRow,
  type AgentBillingMonthlyInvoice,
  type AgentBillingPayment,
  type AgentBillingSummary,
} from '@/lib/crossub-api/agent-billing-client';
import { getStripePublishableKey } from '@/lib/stripe-client';
import { cn, formatAgreementPeriod, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

type BillingTab = 'all' | 'invoice' | 'bills';

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Management fee',
  letting_fee: 'Letting fee',
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

function PrepaidChargeRow({
  row,
  disabled,
  openingInvoiceId,
  onOpenInvoice,
  onViewCharge,
}: {
  row: AgentBillingCharge;
  disabled: boolean;
  openingInvoiceId: string | null;
  onOpenInvoice: (invoiceId: string) => void;
  onViewCharge: (row: AgentBillingCharge) => void;
}) {
  const payable = isPayableCharge(row);
  const opensInvoice = chargeOpensInvoice(row);
  const invoiceId = row.monthlyInvoiceId ?? null;
  const viewLabel = opensInvoice ? 'View invoice' : 'View bill';
  const struck = row.status === 'void' || row.status === 'refunded';

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm font-medium', struck && 'text-muted-foreground line-through')}>
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
        </div>
        <p className={cn('text-muted-foreground mt-1 text-sm', struck && 'line-through')}>
          {row.description}
        </p>
        {row.jobCaseName ? (
          <p className="mt-1 text-sm">
            <JobCaseReferenceLink
              charge={row}
              className={struck ? 'text-muted-foreground line-through' : undefined}
            />
          </p>
        ) : null}
        <p className="text-muted-foreground mt-1 text-xs">
          {[
            `Created ${formatDateTime(row.createdAt)}`,
            row.paidAt ? `Paid ${formatDateTime(row.paidAt)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className={cn('text-sm font-semibold tabular-nums', struck && 'text-muted-foreground line-through')}>
          {formatCurrency(row.amount)}
        </p>
        <Button
          size="sm"
          variant={payable ? 'default' : 'outline'}
          onClick={() => {
            if (opensInvoice && invoiceId) {
              onOpenInvoice(invoiceId);
              return;
            }
            onViewCharge(row);
          }}
          disabled={disabled}
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
    </li>
  );
}

function PropertyGroupedChargeList({
  charges,
  includedUsageByProperty,
  disabled,
  openingInvoiceId,
  onOpenInvoice,
  onViewCharge,
}: {
  charges: AgentBillingCharge[];
  includedUsageByProperty: AgentBillingIncludedUsageRow[];
  disabled: boolean;
  openingInvoiceId: string | null;
  onOpenInvoice: (invoiceId: string) => void;
  onViewCharge: (row: AgentBillingCharge) => void;
}) {
  const groups = groupChargesByProperty(charges, includedUsageByProperty);
  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.map((property) => (
        <section
          key={property.key}
          className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm"
        >
          <header className="border-l-[3px] border-l-sky-500/70 bg-muted/35 px-4 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {propertyGroupKindLabel(property)}
            </p>
            <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{property.propertyLabel}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {property.charges.length} service
                  {property.charges.length === 1 ? '' : 's'}
                  {property.propertyId
                    ? ` · ${formatAgreementPeriod(property.agreementStart, property.agreementEnd)}`
                    : null}
                </p>
                {property.included ? <PropertyIncludedSummary usage={property.included} /> : null}
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(property.billedTotal)}
              </p>
            </div>
          </header>
          <ul className="divide-y">
            {property.charges.map((row) => (
              <PrepaidChargeRow
                key={row.id}
                row={row}
                disabled={disabled}
                openingInvoiceId={openingInvoiceId}
                onOpenInvoice={onOpenInvoice}
                onViewCharge={onViewCharge}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function billedBillAmount(row: AgentBillingCharge): number {
  if (
    row.status === 'void' ||
    row.status === 'refunded' ||
    row.status === 'paid' ||
    row.status === 'included' ||
    row.includedInAllowance
  ) {
    return 0;
  }
  return row.amount;
}

function isCountableBillingRow(status: string): boolean {
  return status !== 'void' && status !== 'refunded';
}

function paidRatioLabel(paid: number, total: number): string {
  if (total <= 0) return '';
  return `${paid}/${total} paid`;
}

function PrepaidMonthlyBillingList({
  charges,
  includedUsageByProperty,
  disabled,
  openingInvoiceId,
  onOpenInvoice,
  onViewCharge,
}: {
  charges: AgentBillingCharge[];
  includedUsageByProperty: AgentBillingIncludedUsageRow[];
  disabled: boolean;
  openingInvoiceId: string | null;
  onOpenInvoice: (invoiceId: string) => void;
  onViewCharge: (row: AgentBillingCharge) => void;
}) {
  const months = useMemo(() => {
    const byMonth = new Map<string, AgentBillingCharge[]>();
    for (const row of charges) {
      const key = monthKeyFromIso(row.createdAt);
      const list = byMonth.get(key) ?? [];
      list.push(row);
      byMonth.set(key, list);
    }
    return [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, rows]) => ({
        key,
        label: monthLabel(key),
        charges: rows,
        totalAud: rows.reduce((sum, row) => sum + billedBillAmount(row), 0),
      }));
  }, [charges]);

  if (months.length === 0) return null;

  return (
    <div className="space-y-5">
      {months.map((month) => (
        <section
          key={month.key}
          className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
        >
          <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
            <h3 className="text-base font-semibold tracking-tight">{month.label}</h3>
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {formatCurrency(month.totalAud)}
            </p>
          </header>
          <div className="p-3">
            <PropertyGroupedChargeList
              charges={month.charges}
              includedUsageByProperty={includedUsageByProperty}
              disabled={disabled}
              openingInvoiceId={openingInvoiceId}
              onOpenInvoice={onOpenInvoice}
              onViewCharge={onViewCharge}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

export default function BillPage() {
  const [summary, setSummary] = useState<AgentBillingSummary | null>(null);
  const [charges, setCharges] = useState<AgentBillingCharge[]>([]);
  const [invoices, setInvoices] = useState<AgentBillingMonthlyInvoice[]>([]);
  const [payments, setPayments] = useState<AgentBillingPayment[]>([]);
  const [includedUsageByProperty, setIncludedUsageByProperty] = useState<
    AgentBillingIncludedUsageRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const [chargeDialog, setChargeDialog] = useState<PlatformChargeDetailDialogState>(null);
  const [invoiceDialog, setInvoiceDialog] = useState<PlatformMonthlyInvoiceDialogState>(null);
  const [setupDialog, setSetupDialog] = useState<StripeSetupDialogState | null>(null);
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false);
  const [billingTab, setBillingTab] = useState<BillingTab>('all');
  const autoPayOpened = useRef(false);

  const stripeConfigured = Boolean(getStripePublishableKey());
  const usesMonthlyInvoice =
    summary?.portalServiceLevel === 'LEVEL_2_FULL_MANAGEMENT' ||
    summary?.portalServiceLevel === 'LEVEL_3_LEGACY';

  const payableInvoices = useMemo(() => invoices.filter(isPayableInvoice), [invoices]);

  const openInvoiceAmount = useMemo(
    () => payableInvoices.reduce((sum, row) => sum + row.amountDue, 0),
    [payableInvoices],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [billing, chargeRows, invoiceRows, pricing, paymentRows] = await Promise.all([
        fetchAgentBillingSummary(),
        listAgentChargeHistory(),
        listAgentInvoiceHistory(),
        fetchAgentBillingPricing().catch(() => null),
        listAgentPaymentHistory().catch(() => []),
      ]);
      setSummary(billing);
      setCharges(chargeRows);
      setInvoices(invoiceRows);
      setPayments(paymentRows);
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

  const prepaidExtras = useMemo(
    () =>
      charges
        .filter((row) => {
          if (isMonthlyInvoiceServiceType(row.serviceType)) return false;
          if (row.monthlyInvoiceId) return false;
          return (
            isPrepaidInspectionServiceType(row.serviceType) || row.collectionMode === 'prepaid'
          );
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [charges],
  );

  const payableBills = useMemo(() => prepaidExtras.filter(isPayableCharge), [prepaidExtras]);
  const billsOutstandingTotal = useMemo(
    () => payableBills.reduce((sum, row) => sum + row.amount, 0),
    [payableBills],
  );
  const outstandingTotal = openInvoiceAmount + billsOutstandingTotal;
  const outstandingCount = payableInvoices.length + payableBills.length;
  const showPayAll = billingTab === 'all' && outstandingCount >= 2;

  const level2MonthGroups = useMemo(
    () =>
      buildLevel2MonthGroups(charges, invoices, {
        overdueLockDays: summary?.overdueLockDays ?? 7,
      }),
    [charges, invoices, summary?.overdueLockDays],
  );

  const invoicePaidCount = invoices.filter((row) => row.status === 'paid').length;
  const invoiceTotalCount = invoices.filter((row) => row.status !== 'void').length;
  const billsPaidCount = prepaidExtras.filter((row) => row.status === 'paid').length;
  const billsTotalCount = prepaidExtras.filter((row) => isCountableBillingRow(row.status)).length;
  const allPaidCount = invoicePaidCount + billsPaidCount;
  const allTotalCount = invoiceTotalCount + billsTotalCount;
  const invoiceCount = level2MonthGroups.length;
  const billsCount = prepaidExtras.length;
  const billingTabs = useMemo(
    () =>
      [
        {
          id: 'all' as const,
          label: paidRatioLabel(allPaidCount, allTotalCount)
            ? `All · ${paidRatioLabel(allPaidCount, allTotalCount)}`
            : 'All',
        },
        {
          id: 'invoice' as const,
          label: paidRatioLabel(invoicePaidCount, invoiceTotalCount)
            ? `Invoice · ${paidRatioLabel(invoicePaidCount, invoiceTotalCount)}`
            : 'Invoice',
        },
        {
          id: 'bills' as const,
          label: paidRatioLabel(billsPaidCount, billsTotalCount)
            ? `Bills · ${paidRatioLabel(billsPaidCount, billsTotalCount)}`
            : 'Bills',
        },
      ] as const,
    [allPaidCount, allTotalCount, invoicePaidCount, invoiceTotalCount, billsPaidCount, billsTotalCount],
  );
  const hasBillingRows = invoiceCount > 0 || billsCount > 0;
  const tabOutstandingTotal =
    billingTab === 'invoice'
      ? openInvoiceAmount
      : billingTab === 'bills'
        ? billsOutstandingTotal
        : outstandingTotal;
  const tabOutstandingCount =
    billingTab === 'invoice'
      ? payableInvoices.length
      : billingTab === 'bills'
        ? payableBills.length
        : outstandingCount;

  const openInvoiceLockDays = useMemo(() => {
    if (!usesMonthlyInvoice || summary?.billingBlocked || !summary?.nextInvoiceDueDate) return null;
    return daysUntilAccountLock(
      summary.nextInvoiceDueDate,
      summary.overdueLockDays ?? 7,
    );
  }, [
    usesMonthlyInvoice,
    summary?.billingBlocked,
    summary?.nextInvoiceDueDate,
    summary?.overdueLockDays,
  ]);

  const outstandingCountDisplay = tabOutstandingCount;

  const openInvoiceById = async (invoiceId: string) => {
    const existing = invoices.find((row) => row.id === invoiceId);
    if (existing) {
      setInvoiceDialog({ invoice: existing });
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
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load invoice');
    } finally {
      setOpeningInvoiceId(null);
    }
  };

  const payInvoiceById = async (invoiceId: string) => {
    const invoice = invoices.find((row) => row.id === invoiceId);
    setPayingInvoiceId(invoiceId);
    try {
      const result = await payAgentMonthlyInvoice(invoiceId, { devConfirm: false });
      const outcome = resolvePaymentFlow(
        result,
        {
          title: 'Monthly platform invoice',
          description: invoice?.invoiceNumber ?? result.invoice.invoiceNumber,
          amountAud: invoice?.amountDue ?? result.invoice.amountDue,
          defaultPaymentMethod: summary?.defaultPaymentMethod,
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
      setPayingInvoiceId(null);
    }
  };

  const payPrepaidCharge = async (row: AgentBillingCharge) => {
    setPayingKey(row.id);
    try {
      const result = await payAgentBillingCharge(row.id, { devConfirm: false });
      const outcome = resolvePaymentFlow(
        result,
        {
          title: SERVICE_LABEL[row.serviceType] ?? 'Platform fee',
          description: row.description,
          amountAud: row.amount,
          calculationDetail: row.calculationDetail,
          calculationSummary: row.calculationSummary,
          defaultPaymentMethod: summary?.defaultPaymentMethod,
          chargeId: row.id,
        },
        setPaymentDialog,
      );
      if (outcome === 'complete') {
        await finalizeBillingChargePayment(row.id);
        toast.success('Payment complete');
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPayingKey(null);
    }
  };

  useEffect(() => {
    if (loading || autoPayOpened.current || paymentDialog != null) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pay') !== '1') return;
    const invoiceId = summary?.openInvoiceId ?? payableInvoices[0]?.id;
    if (!invoiceId && payableBills.length === 0) return;
    autoPayOpened.current = true;
    window.history.replaceState({}, '', '/bill');
    if (invoiceId && payableBills.length === 0) {
      void payInvoiceById(invoiceId);
      return;
    }
    if (!invoiceId && payableBills.length === 1) {
      void payPrepaidCharge(payableBills[0]!);
      return;
    }
    void payAll();
  }, [loading, summary?.openInvoiceId, payableInvoices, payableBills, paymentDialog]);

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

  if (summary?.platformBillingDisabled) {
    return (
      <AgentShell title="Bills">
        <PageIntro
          title="Bills"
          description="Platform billing is paused for your service plan. There is nothing to pay."
        />
      </AgentShell>
    );
  }

  return (
    <AgentShell title={usesMonthlyInvoice ? 'Invoice' : 'Bills'}>
      <div className="space-y-5">
        <PageIntro
          title={usesMonthlyInvoice ? 'Invoice' : 'Bills'}
          description={
            usesMonthlyInvoice
              ? summary?.portalServiceLevel === 'LEVEL_3_LEGACY'
                ? 'Monthly invoice is letting fee and management fee. Extra inspections after included usage are prepaid on Bills. Open inspections are not charged.'
                : 'Monthly invoice is management fee. Extra open, routine, ingoing and outgoing inspections after included usage are prepaid on Bills.'
              : 'Prepaid inspection charges for your agency. Unaccepted jobs are refunded after 48 hours.'
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
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                      . Charged only when you tap Pay.
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm">
                    Save a card for faster checkout. We never charge it automatically.
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

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">
              {usesMonthlyInvoice ? 'Billing' : 'All payments'}
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
          <FilterChips options={billingTabs} value={billingTab} onChange={setBillingTab} />
        </div>

        {summary && tabOutstandingTotal > 0 ? (
          <div
            className={cn(
              'rounded-2xl border p-5 shadow-sm',
              usesMonthlyInvoice && billingTab !== 'bills'
                ? summary.billingBlocked || (openInvoiceLockDays != null && openInvoiceLockDays <= 3)
                  ? 'border-destructive/35 bg-destructive/10'
                  : 'border-amber-500/35 bg-amber-500/10'
                : 'border-border/80 bg-card',
            )}
          >
            <p
              className={
                usesMonthlyInvoice && billingTab !== 'bills'
                  ? 'text-base font-semibold text-amber-950 dark:text-amber-100'
                  : 'text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground'
              }
            >
              {billingTab === 'bills'
                ? 'Prepaid bills'
                : billingTab === 'all'
                  ? 'Invoice + bills'
                  : usesMonthlyInvoice
                    ? summary.billingBlocked ||
                      payableInvoices.some((row) => row.status === 'overdue')
                      ? 'Your invoice is overdue'
                      : 'Your invoice is ready'
                    : 'Outstanding balance'}
            </p>
            <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(tabOutstandingTotal)}
            </p>
            {billingTab === 'bills' ? (
              <p className="text-muted-foreground mt-1 text-sm">
                Extra inspections this month are prepaid. Pay each bill below.
              </p>
            ) : billingTab === 'all' && usesMonthlyInvoice ? (
              <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                {openInvoiceAmount > 0
                  ? `${summary.openInvoiceNumber ? `${summary.openInvoiceNumber} ` : 'Invoice '}${formatCurrency(openInvoiceAmount)}`
                  : 'No monthly invoice due'}
                {billsOutstandingTotal > 0
                  ? ` + ${payableBills.length} prepaid bill${payableBills.length === 1 ? '' : 's'} ${formatCurrency(billsOutstandingTotal)}`
                  : ''}
                {openInvoiceAmount > 0 && billsOutstandingTotal > 0
                  ? ` = ${formatCurrency(outstandingTotal)}`
                  : ''}
                . Invoice is management fee only; inspections are prepaid bills.
              </p>
            ) : usesMonthlyInvoice ? (
              <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                Please pay
                {summary.openInvoiceNumber ? ` ${summary.openInvoiceNumber}` : ' your CROSSUB invoice'}
                {summary.nextInvoiceDueDate && !summary.billingBlocked
                  ? ` by ${formatWhen(summary.nextInvoiceDueDate)}`
                  : ''}
                . Review the tax invoice, then pay to keep full access.
              </p>
            ) : summary.openInvoiceNumber ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.openInvoiceNumber}
                {summary.nextInvoiceDueDate
                  ? ` · due ${formatWhen(summary.nextInvoiceDueDate)}`
                  : null}
              </p>
            ) : null}
            {usesMonthlyInvoice && billingTab !== 'bills' && openInvoiceLockDays != null ? (
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
              {billingTab !== 'bills' && summary.openInvoiceId ? (
                <>
                  <Button
                    type="button"
                    variant={usesMonthlyInvoice ? 'outline' : 'default'}
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
                  {usesMonthlyInvoice ? (
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={() => void payInvoiceById(summary.openInvoiceId!)}
                      disabled={
                        payingInvoiceId != null ||
                        paymentDialog != null ||
                        payingAll
                      }
                    >
                      {payingInvoiceId === summary.openInvoiceId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CreditCard className="size-4" />
                      )}
                      Pay invoice
                    </Button>
                  ) : null}
                </>
              ) : billingTab !== 'bills' && payableInvoices[0] && usesMonthlyInvoice ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setInvoiceDialog({ invoice: payableInvoices[0]! })}
                    disabled={paymentDialog != null || invoiceDialog != null || payingAll}
                  >
                    <FileText className="size-4" />
                    View invoice
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => void payInvoiceById(payableInvoices[0]!.id)}
                    disabled={
                      payingInvoiceId != null || paymentDialog != null || payingAll
                    }
                  >
                    {payingInvoiceId === payableInvoices[0]?.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    Pay invoice
                  </Button>
                </>
              ) : null}
              {showPayAll ? (
                <Button
                  variant={usesMonthlyInvoice ? 'outline' : 'default'}
                  className="w-full sm:w-auto"
                  onClick={() => void payAll()}
                  disabled={payingAll || payingKey != null || paymentDialog != null}
                >
                  {payingAll ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                  Pay all ({outstandingCount} · {formatCurrency(outstandingTotal)})
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {billingTab === 'all' && !hasBillingRows ? (
              <EmptyState
                title="No payments yet"
                description={
                  usesMonthlyInvoice
                    ? 'Monthly invoices and prepaid extras after included usage will appear here.'
                    : 'Prepaid inspections, tribunal sessions, and monthly service invoices will appear here.'
                }
              />
            ) : billingTab === 'invoice' && invoiceCount === 0 ? (
              <EmptyState
                title="No monthly invoices yet"
                description={
                  usesMonthlyInvoice
                    ? 'Management fee, tribunal, and letting fee appear here by property once Accounting sends the invoice. Inspections are prepaid on Bills.'
                    : 'Monthly service invoices will appear here when they are issued.'
                }
              />
            ) : billingTab === 'bills' && billsCount === 0 ? (
              <EmptyState
                title="No prepaid bills yet"
                description={
                  usesMonthlyInvoice
                    ? 'Extra inspections after included usage are prepaid and grouped by property here.'
                    : 'Prepaid inspections and tribunal sessions will appear here, grouped by property.'
                }
              />
            ) : (
              <div className="space-y-6">
                {billingTab !== 'bills' && invoiceCount > 0 ? (
                  <div className="space-y-2">
                    {billingTab === 'all' ? (
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Invoice
                      </h3>
                    ) : null}
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
                      onViewInvoice={(invoice) => setInvoiceDialog({ invoice })}
                      onOpenInvoiceById={(invoiceId) => void openInvoiceById(invoiceId)}
                      onViewCharge={(row) =>
                        setChargeDialog({
                          charge: row,
                          defaultPaymentMethod: summary?.defaultPaymentMethod,
                        })
                      }
                    />
                  </div>
                ) : null}
                {billingTab !== 'invoice' && billsCount > 0 ? (
                  <div className="space-y-2">
                    {billingTab === 'all' ? (
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Bills
                      </h3>
                    ) : null}
                    <PrepaidMonthlyBillingList
                      charges={prepaidExtras}
                      includedUsageByProperty={includedUsageByProperty}
                      disabled={
                        paymentDialog != null ||
                        chargeDialog != null ||
                        invoiceDialog != null ||
                        payingAll ||
                        payingKey != null
                      }
                      openingInvoiceId={openingInvoiceId}
                      onOpenInvoice={(invoiceId) => void openInvoiceById(invoiceId)}
                      onViewCharge={(charge) =>
                        setChargeDialog({
                          charge,
                          defaultPaymentMethod: summary?.defaultPaymentMethod,
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            )}
            <AgentPaymentHistoryList
              payments={payments}
              disabled={
                paymentDialog != null ||
                chargeDialog != null ||
                invoiceDialog != null ||
                payingAll ||
                payingKey != null
              }
              onViewInvoice={(invoiceId) => void openInvoiceById(invoiceId)}
              onViewCharge={(chargeId) => {
                const row = charges.find((charge) => charge.id === chargeId);
                if (row) {
                  setChargeDialog({
                    charge: row,
                    defaultPaymentMethod: summary?.defaultPaymentMethod,
                  });
                  return;
                }
                const item = payments
                  .flatMap((payment) => payment.items)
                  .find((entry) => entry.kind === 'charge' && entry.id === chargeId);
                if (!item) return;
                setChargeDialog({
                  charge: {
                    id: item.id,
                    serviceType: item.serviceType ?? 'open_inspection',
                    collectionMode: 'prepaid',
                    status: item.status,
                    amount: item.amount,
                    currency: 'AUD',
                    description: item.description,
                    propertyId: item.propertyId,
                    jobCaseName: item.jobCaseName,
                    jobCaseId: item.jobCaseId,
                    createdAt: '',
                  },
                  defaultPaymentMethod: summary?.defaultPaymentMethod,
                });
              }}
            />
          </div>
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
