'use client';

import { AlertTriangle, FileText, Loader2, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { JobCaseReferenceLink } from '@/components/billing/job-case-reference-link';
import {
  platformChargeAmountLabel,
  platformChargeShowsAllowanceRemaining,
  type AgentBillingCharge,
  type AgentBillingMonthlyInvoice,
} from '@/lib/crossub-api/agent-billing-client';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Full Service fee',
};

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

function monthKeyFromIso(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

function monthLabel(key: string): string {
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
 * Group Level 2 postpaid charges + monthly invoices by Sydney calendar month.
 * Invoice period (prefer periodEnd) wins for linked charges; otherwise charge createdAt.
 */
export function buildLevel2MonthGroups(
  charges: AgentBillingCharge[],
  invoices: AgentBillingMonthlyInvoice[],
  options?: { overdueLockDays?: number; now?: Date },
): Level2MonthGroup[] {
  const now = options?.now ?? new Date();
  const overdueLockDays = options?.overdueLockDays ?? DEFAULT_OVERDUE_LOCK_DAYS;
  const invoiceById = new Map(invoices.map((row) => [row.id, row]));
  const invoiceByMonth = new Map<string, AgentBillingMonthlyInvoice>();
  for (const invoice of invoices) {
    const key = monthKeyFromIso(invoice.periodEnd || invoice.periodStart);
    const existing = invoiceByMonth.get(key);
    if (!existing || new Date(invoice.periodEnd).getTime() > new Date(existing.periodEnd).getTime()) {
      invoiceByMonth.set(key, invoice);
    }
  }

  const chargesByMonth = new Map<string, AgentBillingCharge[]>();
  for (const charge of charges) {
    if (charge.collectionMode !== 'postpaid') continue;
    if (charge.status === 'refunded') continue;

    let key: string;
    if (charge.monthlyInvoiceId && invoiceById.has(charge.monthlyInvoiceId)) {
      const invoice = invoiceById.get(charge.monthlyInvoiceId)!;
      key = monthKeyFromIso(invoice.periodEnd || invoice.periodStart);
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
      invoice != null
        ? invoice.amountDue
        : monthCharges
            .filter((row) => row.status !== 'void')
            .reduce((sum, row) => sum + row.amount, 0);

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

type Level2MonthlyBillingListProps = {
  charges: AgentBillingCharge[];
  invoices: AgentBillingMonthlyInvoice[];
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
    <div className="space-y-4">
      {groups.map((group) => {
        const showLockCountdown =
          !billingBlocked &&
          group.paymentStatus === 'unpaid' &&
          group.daysUntilAccountLock != null;

        return (
          <section key={group.key} className="overflow-hidden rounded-xl border bg-card">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{group.label}</h3>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      paymentStatusTone(group.paymentStatus),
                    )}
                  >
                    {paymentStatusLabel(group.paymentStatus)}
                  </span>
                  {group.invoice?.status === 'overdue' ? (
                    <span className="inline-flex rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                      Overdue
                    </span>
                  ) : null}
                  {showLockCountdown ? (
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
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
                    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
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
              <p className="text-sm font-semibold tabular-nums">{formatCurrency(group.totalAud)}</p>
            </header>

            {billingBlocked && group.paymentStatus === 'unpaid' ? (
              <div className="flex gap-2 border-b border-destructive/25 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                <p>Account locked — pay this invoice to restore full access to the Agent app.</p>
              </div>
            ) : showLockCountdown ? (
              <div
                className={cn(
                  'flex gap-2 border-b px-4 py-2.5 text-xs',
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
              <div className="flex gap-2 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  This month has ended and the invoice is still unpaid. Pay as soon as it is
                  available.
                </p>
              </div>
            ) : null}

            {group.charges.length === 0 ? (
              <p className="text-muted-foreground px-4 py-4 text-sm">
                No service lines listed for this month yet.
              </p>
            ) : (
              <ul className="divide-y">
                {group.charges.map((row) => {
                  const struck = isNotCharged(row);
                  const showRemaining = platformChargeShowsAllowanceRemaining(row);
                  return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className={cn('min-w-0 flex-1', struck && 'text-muted-foreground')}>
                      <p className={cn('text-sm font-medium', struck && 'line-through')}>
                        {serviceLabel(row.serviceType)}
                      </p>
                      <p
                        className={cn(
                          'text-muted-foreground mt-0.5 text-sm',
                          struck && 'line-through',
                        )}
                      >
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
                          row.refundedAt ? `Refunded ${formatDateTime(row.refundedAt)}` : null,
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
                          'text-sm font-semibold',
                          !showRemaining && 'tabular-nums',
                          struck && 'text-muted-foreground line-through',
                        )}
                      >
                        {platformChargeAmountLabel(row, formatCurrency)}
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
            )}

            <footer className="border-t bg-muted/20 px-4 py-3">
              {group.invoice ? (
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  variant={group.paymentStatus === 'unpaid' ? 'default' : 'outline'}
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
