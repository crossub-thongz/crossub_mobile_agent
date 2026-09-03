'use client';

import { AlertTriangle, ChevronDown, FileText, Loader2, Lock } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { JobCaseReferenceLink } from '@/components/billing/job-case-reference-link';
import {
  includedAllowanceRemainingLabel,
  isMonthlyInvoiceServiceType,
  platformChargeServiceAmountLabel,
  platformChargeShowsAllowanceRemaining,
  propertyLabelFromCharge,
  type AgentBillingCharge,
  type AgentBillingIncludedUsageRow,
  type AgentBillingMonthlyInvoice,
} from '@/lib/crossub-api/agent-billing-client';
import { cn, formatAgreementPeriod, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Management fee',
  letting_fee: 'Letting fee',
};

/** Management fee, then letting fee, then every other service on that property. */
function serviceDisplayRank(serviceType: string): number {
  if (serviceType === 'service_fee') return 0;
  if (serviceType === 'letting_fee') return 1;
  return 2;
}

function sortPropertyServiceCharges(charges: AgentBillingCharge[]): AgentBillingCharge[] {
  return [...charges].sort((a, b) => {
    const rank = serviceDisplayRank(a.serviceType) - serviceDisplayRank(b.serviceType);
    if (rank !== 0) return rank;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const SYDNEY_TZ = 'Australia/Sydney';
const DEFAULT_OVERDUE_LOCK_DAYS = 7;

export type Level2MonthGroup = {
  key: string;
  label: string;
  charges: AgentBillingCharge[];
  invoice: AgentBillingMonthlyInvoice | null;
  paymentStatus: 'paid' | 'unpaid' | 'accruing';
  showOverdueWarning: boolean;
  /** Whole days until portal lock; null when paid/accruing/no due date. */
  daysUntilAccountLock: number | null;
  totalAud: number;
};

export type Level2PropertyChargeGroup = {
  key: string;
  propertyId: string | null;
  propertyLabel: string;
  charges: AgentBillingCharge[];
  billedTotal: number;
  agreementStart: string | null;
  agreementEnd: string | null;
  included: {
    routine: { included: number; used: number; remaining: number };
    ingoing: { included: number; used: number; remaining: number };
    outgoing: { included: number; used: number; remaining: number };
  } | null;
};

function billedChargeAmount(row: AgentBillingCharge): number {
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

function serviceLabel(raw: string): string {
  return SERVICE_LABEL[raw] ?? raw.replace(/_/g, ' ');
}

function isNotCharged(row: AgentBillingCharge): boolean {
  return row.status === 'void' || row.status === 'refunded';
}

function notChargedCaption(row: AgentBillingCharge): string {
  if (row.status === 'refunded') return 'Refunded — not charged';
  const reason = (row.voidReason ?? '').toLowerCase();
  if (reason.includes('cancel') || reason.includes('deleted')) {
    return 'Not charged — job cancelled';
  }
  if (reason.includes('inspector')) {
    return 'Not charged — no inspector confirmed within 48 hours';
  }
  return 'Not charged';
}

export function monthKeyFromIso(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function currentSydneyMonthKey(now = new Date()): string {
  return monthKeyFromIso(now.toISOString());
}

function isMonthEnded(key: string, now = new Date()): boolean {
  return currentSydneyMonthKey(now) > key;
}

/** Days until lockAt (dueDate + overdueLockDays). Ceil so partial days still count. */
export function daysUntilAccountLock(
  dueDateIso: string,
  overdueLockDays: number,
  now = new Date(),
): number {
  const lockAt =
    new Date(dueDateIso).getTime() + overdueLockDays * 24 * 60 * 60 * 1000;
  return Math.ceil((lockAt - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function formatAccountLockCountdown(days: number): string {
  if (days <= 0) return 'Account locks today if unpaid';
  if (days === 1) return '1 day remaining until account lock';
  return `${days} days remaining until account lock`;
}

/**
 * Group Level 2 invoice-eligible charges + monthly invoices by Sydney calendar month.
 * Invoice periodStart is the billing month (periodEnd can land on 1 Sep in Sydney).
 */
export function buildLevel2MonthGroups(
  charges: AgentBillingCharge[],
  invoices: AgentBillingMonthlyInvoice[],
  options?: { overdueLockDays?: number; now?: Date },
): Level2MonthGroup[] {
  const now = options?.now ?? new Date();
  const overdueLockDays = options?.overdueLockDays ?? DEFAULT_OVERDUE_LOCK_DAYS;
  const invoiceById = new Map(
    invoices
      .filter((row) => {
        const status = row.status.toLowerCase();
        return status !== 'draft' && status !== 'void';
      })
      .map((row) => [row.id, row]),
  );
  const invoiceByMonth = new Map<string, AgentBillingMonthlyInvoice>();
  for (const invoice of invoiceById.values()) {
    const key = monthKeyFromIso(invoice.periodStart || invoice.periodEnd);
    const existing = invoiceByMonth.get(key);
    if (!existing || new Date(invoice.periodEnd).getTime() > new Date(existing.periodEnd).getTime()) {
      invoiceByMonth.set(key, invoice);
    }
  }

  const chargesByMonth = new Map<string, AgentBillingCharge[]>();
  for (const charge of charges) {
    const linkedInvoice =
      charge.monthlyInvoiceId && invoiceById.has(charge.monthlyInvoiceId)
        ? invoiceById.get(charge.monthlyInvoiceId)
        : undefined;
    const alreadyOnInvoice = Boolean(linkedInvoice);
    if (!isMonthlyInvoiceServiceType(charge.serviceType)) continue;
    if (!alreadyOnInvoice && charge.collectionMode !== 'postpaid') continue;
    if (charge.includedInAllowance || charge.status === 'included') continue;
    if (charge.status === 'refunded') continue;

    let key: string;
    if (charge.monthlyInvoiceId && invoiceById.has(charge.monthlyInvoiceId)) {
      const invoice = invoiceById.get(charge.monthlyInvoiceId)!;
      key = monthKeyFromIso(invoice.periodStart || invoice.periodEnd);
    } else {
      key = monthKeyFromIso(charge.createdAt);
    }

    const list = chargesByMonth.get(key) ?? [];
    list.push(charge);
    chargesByMonth.set(key, list);
  }

  const keys = new Set<string>([...chargesByMonth.keys(), ...invoiceByMonth.keys()]);
  const groups: Level2MonthGroup[] = [];

  for (const key of keys) {
    const monthCharges = (chargesByMonth.get(key) ?? []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const invoice = invoiceByMonth.get(key) ?? null;
    const ended = isMonthEnded(key, now);

    let paymentStatus: Level2MonthGroup['paymentStatus'];
    if (invoice?.status === 'paid') {
      paymentStatus = 'paid';
    } else if (invoice) {
      paymentStatus = 'unpaid';
    } else {
      paymentStatus = 'accruing';
    }

    const showOverdueWarning =
      paymentStatus === 'unpaid' &&
      (invoice?.status === 'overdue' || ended);

    const daysRemaining =
      paymentStatus === 'unpaid' && invoice?.dueDate
        ? daysUntilAccountLock(invoice.dueDate, overdueLockDays, now)
        : null;

    const totalAud =
      invoice?.status === 'paid'
        ? 0
        : invoice != null
          ? invoice.amountDue
          : monthCharges.reduce((sum, row) => sum + billedChargeAmount(row), 0);

    groups.push({
      key,
      label: monthLabel(key),
      charges: monthCharges,
      invoice,
      paymentStatus,
      showOverdueWarning,
      daysUntilAccountLock: daysRemaining,
      totalAud,
    });
  }

  return groups.sort((a, b) => b.key.localeCompare(a.key));
}

export function propertyGroupKindLabel(
  group: Pick<Level2PropertyChargeGroup, 'propertyId' | 'key'>,
): string {
  if (group.propertyId) return 'Property';
  if (group.key === 'service_fee') return 'Management fee';
  if (group.key === 'letting_fee') return 'Letting fee';
  return 'Agency';
}

function ungroupedChargeKey(charge: AgentBillingCharge): string {
  if (charge.propertyId) return charge.propertyId;
  if (charge.serviceType === 'service_fee') return 'service_fee';
  if (charge.serviceType === 'letting_fee') return 'letting_fee';
  return 'agency';
}

export function groupChargesByProperty(
  charges: AgentBillingCharge[],
  includedUsageByProperty: AgentBillingIncludedUsageRow[] = [],
): Level2PropertyChargeGroup[] {
  const usageById = new Map(includedUsageByProperty.map((row) => [row.propertyId, row]));
  const groups = new Map<string, Level2PropertyChargeGroup>();

  for (const charge of charges) {
    const key = ungroupedChargeKey(charge);
    let group = groups.get(key);
    if (!group) {
      const catalog = charge.propertyId ? usageById.get(charge.propertyId) : undefined;
      group = {
        key,
        propertyId: charge.propertyId ?? null,
        propertyLabel: catalog?.propertyLabel ?? propertyLabelFromCharge(charge),
        charges: [],
        billedTotal: 0,
        agreementStart: catalog?.agreementStart ?? null,
        agreementEnd: catalog?.agreementEnd ?? null,
        included: null,
      };
      groups.set(key, group);
    }
    group.charges.push(charge);
    group.billedTotal += billedChargeAmount(charge);
  }

  for (const group of groups.values()) {
    group.charges = sortPropertyServiceCharges(group.charges);
    if (!group.propertyId) {
      group.included = null;
      continue;
    }
    const catalog = usageById.get(group.propertyId);
    // Catalog is attached only for Level 2 / Level 3. Do not invent 3/1/1
    // remaining from prepaid Level 1 charges when includedUsageByProperty is empty.
    group.included = catalog
      ? {
          routine: catalog.routine,
          ingoing: catalog.ingoing,
          outgoing: catalog.outgoing,
        }
      : null;
  }

  return [...groups.values()].sort((a, b) => {
    const rank = (group: Level2PropertyChargeGroup) => {
      if (group.key === 'service_fee') return 0;
      if (group.key === 'letting_fee') return 1;
      if (group.propertyId) return 2;
      return 3;
    };
    const byKind = rank(a) - rank(b);
    if (byKind !== 0) return byKind;
    return a.propertyLabel.localeCompare(b.propertyLabel);
  });
}

function includedChipTone(remaining: number): string {
  if (remaining > 0) {
    return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-50';
  }
  return 'border-amber-500/40 bg-amber-500/15 text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-50';
}

export function PropertyIncludedSummary({
  usage,
  className,
}: {
  usage: NonNullable<Level2PropertyChargeGroup['included']>;
  className?: string;
}) {
  const items = [
    { label: 'Routine', usage: usage.routine },
    { label: 'Ingoing', usage: usage.ingoing },
    { label: 'Outgoing', usage: usage.outgoing },
  ] as const;

  return (
    <div className={cn(
      'rounded-xl border border-sky-500/30 bg-sky-500/[0.08] px-3 py-2.5 dark:border-sky-400/25 dark:bg-sky-500/10',
      className ?? 'mt-2.5',
    )}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-900 dark:text-sky-100">
        Yearly included remaining
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item.label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none shadow-sm',
              includedChipTone(item.usage.remaining),
            )}
          >
            <span>{item.label}</span>
            <span className="tabular-nums font-bold">
              {includedAllowanceRemainingLabel(item.usage)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PropertyChargeGroupCard({
  property,
  framed = true,
  children,
}: {
  property: Level2PropertyChargeGroup;
  framed?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={cn(
        framed && 'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm',
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="w-full border-l-[3px] border-l-sky-500/70 bg-muted/35 px-4 py-3.5 text-left transition hover:bg-muted/50 md:px-5"
      >
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
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(property.billedTotal)}
            </p>
            <ChevronDown
              className={cn(
                'text-muted-foreground size-4 shrink-0 transition-transform',
                open && 'rotate-180',
              )}
              aria-hidden
            />
          </div>
        </div>
      </button>
      {open ? (
        <div>
          {property.included ? (
            <div className="border-b px-4 py-3 md:px-5">
              <PropertyIncludedSummary usage={property.included} className="mt-0" />
            </div>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

function paymentStatusTone(status: Level2MonthGroup['paymentStatus']): string {
  if (status === 'paid') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (status === 'accruing') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
}

function paymentStatusLabel(status: Level2MonthGroup['paymentStatus']): string {
  if (status === 'paid') return 'Paid';
  if (status === 'accruing') return 'Accruing';
  return 'Not paid';
}

const CHARGE_STATUS_TONE: Record<string, string> = {
  paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  included: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  awaiting_payment: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  accrued: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  invoiced: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  refunded: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  void: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

function chargeStatusLabel(raw: string): string {
  if (raw === 'void') return 'Not charged';
  if (raw === 'included') return 'Included';
  return raw.replace(/_/g, ' ');
}

type Level2MonthlyBillingListProps = {
  charges: AgentBillingCharge[];
  invoices: AgentBillingMonthlyInvoice[];
  includedUsageByProperty?: AgentBillingIncludedUsageRow[];
  overdueLockDays?: number;
  billingBlocked?: boolean;
  openingInvoiceId: string | null;
  disabled?: boolean;
  onViewInvoice: (invoice: AgentBillingMonthlyInvoice) => void;
  onOpenInvoiceById: (invoiceId: string) => void;
  onViewCharge: (charge: AgentBillingCharge) => void;
};

export function Level2MonthlyBillingList({
  charges,
  invoices,
  includedUsageByProperty = [],
  overdueLockDays = DEFAULT_OVERDUE_LOCK_DAYS,
  billingBlocked = false,
  openingInvoiceId,
  disabled = false,
  onViewInvoice,
  onOpenInvoiceById: _onOpenInvoiceById,
  onViewCharge,
}: Level2MonthlyBillingListProps) {
  const groups = buildLevel2MonthGroups(charges, invoices, { overdueLockDays });

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const showLockCountdown =
          !billingBlocked &&
          group.paymentStatus === 'unpaid' &&
          group.daysUntilAccountLock != null;

        return (
          <section
            key={group.key}
            className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight">{group.label}</h3>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                      paymentStatusTone(group.paymentStatus),
                    )}
                  >
                    {paymentStatusLabel(group.paymentStatus)}
                  </span>
                  {group.invoice?.status === 'overdue' ? (
                    <span className="inline-flex rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                      Overdue
                    </span>
                  ) : null}
                  {showLockCountdown ? (
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                        group.daysUntilAccountLock! <= 3
                          ? 'border-destructive/30 bg-destructive/10 text-destructive'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
                      )}
                    >
                      {group.daysUntilAccountLock! <= 0
                        ? 'Locks today'
                        : `${group.daysUntilAccountLock}d to lock`}
                    </span>
                  ) : null}
                  {billingBlocked && group.paymentStatus === 'unpaid' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                      <Lock className="size-3" />
                      Account locked
                    </span>
                  ) : null}
                </div>
                {group.invoice ? (
                  <p className="text-muted-foreground text-xs">
                    {group.invoice.invoiceNumber}
                    {group.invoice.dueDate ? ` · due ${formatDate(group.invoice.dueDate)}` : null}
                    {group.invoice.paidAt
                      ? ` · paid ${formatDateTime(group.invoice.paidAt)}`
                      : null}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    {group.paymentStatus === 'accruing'
                      ? 'Charges this month — your invoice appears after CROSSUB Accounting approves it'
                      : 'Invoice will appear here after CROSSUB Accounting approves it'}
                  </p>
                )}
              </div>
              <p className="text-lg font-semibold tabular-nums tracking-tight">
                {formatCurrency(group.totalAud)}
              </p>
            </header>

            {billingBlocked && group.paymentStatus === 'unpaid' ? (
              <div className="flex gap-2 border-b border-destructive/25 bg-destructive/10 px-5 py-3 text-xs text-destructive">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                <p>Account locked — pay this invoice to restore full access to the Agent app.</p>
              </div>
            ) : showLockCountdown ? (
              <div
                className={cn(
                  'flex gap-2 border-b px-5 py-3 text-xs',
                  group.daysUntilAccountLock! <= 3
                    ? 'border-destructive/25 bg-destructive/10 text-destructive'
                    : 'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-100',
                )}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  {formatAccountLockCountdown(group.daysUntilAccountLock!)}.
                  {group.invoice?.status === 'overdue'
                    ? ' This invoice is overdue.'
                    : ' Pay before then to keep full access.'}
                </p>
              </div>
            ) : group.showOverdueWarning ? (
              <div className="flex gap-2 border-b border-amber-500/25 bg-amber-500/10 px-5 py-3 text-xs text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  This month has ended and the invoice is still unpaid. Pay as soon as it is
                  available.
                </p>
              </div>
            ) : null}

            {group.charges.length === 0 ? (
              <p className="text-muted-foreground px-5 py-5 text-sm">
                No service lines listed for this month yet.
              </p>
            ) : (
              <div className="divide-y">
                {groupChargesByProperty(group.charges, includedUsageByProperty).map((property) => (
                  <PropertyChargeGroupCard key={property.key} property={property} framed={false}>
                    <ul className="divide-y">
                      {property.charges.map((row) => {
                        const struck = isNotCharged(row);
                        const showRemaining = platformChargeShowsAllowanceRemaining(row);
                        return (
                          <li
                            key={row.id}
                            className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 pl-8 hover:bg-muted/20"
                          >
                            <div className={cn('min-w-0 flex-1', struck && 'text-muted-foreground')}>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={cn('text-sm font-medium', struck && 'line-through')}>
                                  {serviceLabel(row.serviceType)}
                                </p>
                                <span
                                  className={cn(
                                    'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                    CHARGE_STATUS_TONE[row.status] ??
                                      'border-border bg-muted text-muted-foreground',
                                  )}
                                >
                                  {chargeStatusLabel(row.status)}
                                </span>
                              </div>
                              <p
                                className={cn(
                                  'text-muted-foreground mt-0.5 text-xs leading-snug',
                                  struck && 'line-through',
                                )}
                              >
                                {row.description}
                              </p>
                              {row.jobCaseName ? (
                                <p className="mt-1 text-sm">
                                  <JobCaseReferenceLink
                                    charge={row}
                                    className={
                                      struck ? 'text-muted-foreground line-through' : undefined
                                    }
                                  />
                                </p>
                              ) : null}
                              {struck ? (
                                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {notChargedCaption(row)}
                                </p>
                              ) : null}
                              {row.calculationDetail && !showRemaining ? (
                                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                  {row.calculationDetail}
                                </p>
                              ) : null}
                              <p className="text-muted-foreground mt-1 text-xs">
                                {[
                                  row.createdByName ? `Created by ${row.createdByName}` : null,
                                  `Created ${formatDateTime(row.createdAt)}`,
                                  row.paidAt && !showRemaining
                                    ? `Paid ${formatDateTime(row.paidAt)}`
                                    : null,
                                  row.refundedAt
                                    ? `Refunded ${formatDateTime(row.refundedAt)}`
                                    : null,
                                  row.voidedAt && row.status === 'void'
                                    ? `Not charged ${formatDateTime(row.voidedAt)}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <p
                                className={cn(
                                  'text-sm font-semibold tabular-nums',
                                  struck && 'text-muted-foreground line-through',
                                )}
                              >
                                {platformChargeServiceAmountLabel(row, formatCurrency)}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs"
                                onClick={() => onViewCharge(row)}
                                disabled={disabled}
                              >
                                Details
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </PropertyChargeGroupCard>
                ))}
              </div>
            )}

            <footer className="border-t bg-muted/25 px-5 py-3.5">
              {group.invoice ? (
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  variant="outline"
                  onClick={() => onViewInvoice(group.invoice!)}
                  disabled={disabled || openingInvoiceId === group.invoice.id}
                >
                  {openingInvoiceId === group.invoice.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                  View invoice
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs">
                  View invoice appears here after CROSSUB Accounting approves and sends it.
                </p>
              )}
            </footer>
          </section>
        );
      })}
    </div>
  );
}
