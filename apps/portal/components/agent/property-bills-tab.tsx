'use client';

import Link from 'next/link';
import { CreditCard, Loader2, Receipt, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { JobCaseReferenceLink } from '@/components/billing/job-case-reference-link';
import {
  groupChargesByProperty,
  monthKeyFromIso,
  monthLabel,
  PropertyIncludedSummary,
  propertyGroupKindLabel,
} from '@/components/billing/level2-monthly-billing';
import {
  PlatformChargeDetailDialog,
  type PlatformChargeDetailDialogState,
} from '@/components/billing/platform-charge-detail-dialog';
import { StripePaymentDialog, type StripePaymentDialogState } from '@/components/billing/stripe-payment-dialog';
import { Button } from '@/components/ui/button';
import {
  fetchAgentBillingPricing,
  fetchAgentBillingSummary,
  listAgentChargeHistory,
  platformChargeServiceAmountLabel,
  type AgentBillingCharge,
  type AgentBillingDefaultPaymentMethod,
  type AgentBillingIncludedUsageRow,
} from '@/lib/crossub-api/agent-billing-client';
import { ROUTES } from '@/constants/routes';
import { fetchProperty } from '@/lib/crossub-api/agent-client';
import { cn, formatAgreementPeriod, formatCurrency, formatDateTime } from '@/lib/utils';

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
  included: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  awaiting_payment: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  accrued: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  invoiced: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  refunded: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  void: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

function serviceLabel(raw: string): string {
  return SERVICE_LABEL[raw] ?? raw.replace(/_/g, ' ');
}

function statusLabel(raw: string): string {
  if (raw === 'void') return 'Not charged';
  if (raw === 'included') return 'Included';
  return raw.replace(/_/g, ' ');
}

export function PropertyBillsTab({
  propertyId,
  invoiceMode = false,
}: {
  propertyId: string;
  invoiceMode?: boolean;
}) {
  const [charges, setCharges] = useState<AgentBillingCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [includedUsage, setIncludedUsage] = useState<AgentBillingIncludedUsageRow | null>(null);
  const [agreementStart, setAgreementStart] = useState<string | null>(null);
  const [agreementEnd, setAgreementEnd] = useState<string | null>(null);
  const [defaultPaymentMethod, setDefaultPaymentMethod] =
    useState<AgentBillingDefaultPaymentMethod | null>(null);
  const [chargeDialog, setChargeDialog] = useState<PlatformChargeDetailDialogState>(null);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, summary, pricing, property] = await Promise.all([
        listAgentChargeHistory(propertyId),
        fetchAgentBillingSummary().catch(() => null),
        fetchAgentBillingPricing().catch(() => null),
        fetchProperty(propertyId).catch(() => null),
      ]);
      setCharges(rows);
      setDefaultPaymentMethod(summary?.defaultPaymentMethod ?? null);
      const usage =
        pricing?.level2.includedUsageByProperty?.find((row) => row.propertyId === propertyId) ??
        null;
      setIncludedUsage(usage);
      setAgreementStart(usage?.agreementStart ?? property?.leaseStart ?? null);
      setAgreementEnd(usage?.agreementEnd ?? property?.leaseEnd ?? null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : invoiceMode
            ? 'Could not load property invoice items'
            : 'Could not load property bills',
      );
      setCharges([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId, invoiceMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthGroups = useMemo(() => {
    const usage = includedUsage ? [includedUsage] : [];
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
        properties: groupChargesByProperty(rows, usage),
      }));
  }, [charges, includedUsage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{invoiceMode ? 'Invoice' : 'Bills'}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {invoiceMode ? (
              <>
                Every inspection and tribunal case on this property appears here. Accrued items
                appear on your monthly invoice — included, cancelled, and unaccepted jobs are listed
                and not charged. Open the agency{' '}
                <Link href={ROUTES.BILL} className="text-primary font-medium hover:underline">
                  Invoice
                </Link>{' '}
                page for monthly totals.
              </>
            ) : (
              <>
                CROSSUB platform charges for this property — status, amount paid, and how each fee
                was calculated. Pay outstanding items from the agency{' '}
                <Link href={ROUTES.BILL} className="text-primary font-medium hover:underline">
                  Bills
                </Link>{' '}
                page.
              </>
            )}
          </p>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {formatAgreementPeriod(agreementStart, agreementEnd)}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>

      {loading && charges.length === 0 ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {invoiceMode ? 'Loading invoice…' : 'Loading bills…'}
        </div>
      ) : charges.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={invoiceMode ? 'No invoice items yet' : 'No platform bills yet'}
          description={
            invoiceMode
              ? 'Inspections and tribunal cases for this property appear here as soon as they are created. Unaccepted jobs are marked not charged and never invoiced.'
              : 'Inspection and tribunal platform charges for this property will appear here after they are quoted or accepted.'
          }
        />
      ) : (
        <div className="space-y-5">
          {monthGroups.map((month) => (
            <section
              key={month.key}
              className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
            >
              <header className="border-b bg-muted/30 px-5 py-4">
                <h3 className="text-base font-semibold tracking-tight">{month.label}</h3>
              </header>
              {month.properties.map((property) => (
                <div key={property.key} className="border-b last:border-b-0">
                  <div className="border-l-[3px] border-l-sky-500/70 bg-muted/35 px-5 py-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {propertyGroupKindLabel(property)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">
                          {property.propertyLabel}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {property.charges.length} service
                          {property.charges.length === 1 ? '' : 's'}
                          {` · ${formatAgreementPeriod(
                            property.agreementStart,
                            property.agreementEnd,
                          )}`}
                        </p>
                        {property.included ? (
                          <PropertyIncludedSummary usage={property.included} />
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCurrency(property.billedTotal)}
                      </p>
                    </div>
                  </div>
                  <ul className="divide-y">
                    {property.charges.map((row) => {
                      const paid = row.status === 'paid' || row.status === 'included';
                      const struck = row.status === 'void' || row.status === 'refunded';
                      return (
                        <li key={row.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setChargeDialog({
                                charge: row,
                                defaultPaymentMethod,
                              })
                            }
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              setChargeDialog({
                                charge: row,
                                defaultPaymentMethod,
                              });
                            }}
                            className="hover:bg-muted/20 w-full cursor-pointer px-5 py-3.5 pl-8 text-left transition"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className={cn('min-w-0 space-y-1', struck && 'text-muted-foreground')}>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className={cn('text-sm font-semibold', struck && 'line-through')}>
                                    {serviceLabel(row.serviceType)}
                                  </p>
                                  <span
                                    className={cn(
                                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                      STATUS_TONE[row.status] ??
                                        'border-border bg-muted text-muted-foreground',
                                    )}
                                  >
                                    {statusLabel(row.status)}
                                  </span>
                                </div>
                                <p
                                  className={cn(
                                    'text-muted-foreground text-xs leading-snug',
                                    struck && 'line-through',
                                  )}
                                >
                                  {row.description}
                                </p>
                                {row.jobCaseName ? (
                                  <p className="text-xs">
                                    <JobCaseReferenceLink
                                      charge={row}
                                      onNavigate={() => setChargeDialog(null)}
                                      className={
                                        struck ? 'text-muted-foreground line-through' : undefined
                                      }
                                    />
                                  </p>
                                ) : null}
                                <p className="text-muted-foreground text-xs">
                                  {[
                                    row.createdByName ? `Created by ${row.createdByName}` : null,
                                    `Created ${formatDateTime(row.createdAt)}`,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p
                                  className={cn(
                                    'text-sm font-semibold tabular-nums',
                                    struck && 'text-muted-foreground line-through',
                                  )}
                                >
                                  {platformChargeServiceAmountLabel(row, formatCurrency)}
                                </p>
                                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                                  {row.status === 'void'
                                    ? 'Not charged'
                                    : row.status === 'included' || row.includedInAllowance
                                      ? 'Included'
                                      : row.collectionMode === 'postpaid'
                                        ? 'Monthly invoice'
                                        : 'Prepaid'}
                                </p>
                              </div>
                            </div>

                            <dl className="mt-3 grid gap-2 border-t border-border/60 pt-3 text-xs sm:grid-cols-2">
                              <div>
                                <dt className="text-muted-foreground">{paid ? 'Paid' : 'Payment'}</dt>
                                <dd className="font-medium">
                                  {row.status === 'void'
                                    ? row.voidReason?.trim()
                                      ? row.voidReason
                                      : 'Not charged'
                                    : row.status === 'included' || row.includedInAllowance
                                    ? 'Included in Full Service'
                                    : row.paidAt
                                      ? formatDateTime(row.paidAt)
                                      : row.status === 'accrued'
                                        ? invoiceMode
                                          ? 'Accrued — on monthly invoice if inspector confirms'
                                          : 'Accrued — pay with monthly invoice'
                                        : row.status === 'invoiced'
                                          ? 'On monthly invoice'
                                          : row.status === 'refunded'
                                            ? '—'
                                            : paid
                                              ? 'Paid'
                                              : 'Not paid yet'}
                                </dd>
                              </div>
                              {row.refundedAt ? (
                                <div>
                                  <dt className="text-muted-foreground">Refunded</dt>
                                  <dd className="font-medium">{formatDateTime(row.refundedAt)}</dd>
                                </div>
                              ) : null}
                              {row.voidedAt && row.status === 'void' ? (
                                <div>
                                  <dt className="text-muted-foreground">Not charged</dt>
                                  <dd className="font-medium">{formatDateTime(row.voidedAt)}</dd>
                                </div>
                              ) : null}
                              {row.calculationSummary ? (
                                <div className="sm:col-span-2">
                                  <dt className="text-muted-foreground">Billing basis</dt>
                                  <dd className="mt-0.5 leading-relaxed">{row.calculationSummary}</dd>
                                </div>
                              ) : null}
                              {row.calculationDetail ? (
                                <div className="sm:col-span-2">
                                  <dt className="text-muted-foreground">How it&apos;s calculated</dt>
                                  <dd className="mt-0.5 leading-relaxed">{row.calculationDetail}</dd>
                                </div>
                              ) : null}
                            </dl>

                            <p className="text-primary mt-3 flex items-center gap-1 text-xs font-medium">
                              <CreditCard className="size-3.5" />
                              View details
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <PlatformChargeDetailDialog
        state={chargeDialog}
        onOpenChange={(open) => {
          if (!open) setChargeDialog(null);
        }}
        onPaid={async () => {
          setChargeDialog(null);
          await load();
        }}
        paymentDialog={paymentDialog}
        setPaymentDialog={setPaymentDialog}
      />

      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(open) => {
          if (!open) setPaymentDialog(null);
        }}
        onSuccess={async () => {
          setPaymentDialog(null);
          setChargeDialog(null);
          await load();
        }}
      />
    </div>
  );
}
