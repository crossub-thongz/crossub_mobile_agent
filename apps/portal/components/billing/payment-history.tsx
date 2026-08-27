'use client';

import { FileText, Receipt } from 'lucide-react';

import { JobCaseReferenceLink } from '@/components/billing/job-case-reference-link';
import { Button } from '@/components/ui/button';
import type { AgentBillingPayment } from '@/lib/crossub-api/agent-billing-client';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

const STATUS_TONE: Record<string, string> = {
  paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  refunded: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

function paymentCaption(row: AgentBillingPayment): string {
  if (row.status === 'refunded') return 'Refunded';
  if (row.itemCount > 1) {
    return `Paid together · ${row.itemCount} bills`;
  }
  return 'Paid';
}

export function AgentPaymentHistoryList({
  payments,
  disabled,
  onViewCharge,
  onViewInvoice,
}: {
  payments: AgentBillingPayment[];
  disabled?: boolean;
  onViewCharge: (chargeId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
}) {
  if (payments.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Payment history
      </h3>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <header className="flex items-start gap-3 border-b bg-muted/30 px-5 py-4">
          <Receipt className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Receipts</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Card charges, including bills you paid together.
            </p>
          </div>
        </header>
        <ul className="divide-y">
          {payments.map((payment) => (
            <li key={payment.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{formatDateTime(payment.paidAt)}</p>
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        STATUS_TONE[payment.status] ?? 'border-border text-muted-foreground',
                      )}
                    >
                      {paymentCaption(payment)}
                    </span>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(payment.amountAud)}
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {payment.items.map((item) => (
                  <li
                    key={`${item.kind}:${item.id}`}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{item.description}</p>
                      {item.kind === 'charge' && item.jobCaseName ? (
                        <p className="mt-1 text-sm">
                          <JobCaseReferenceLink charge={item} />
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(item.amount)}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => {
                          if (item.kind === 'invoice') {
                            onViewInvoice(item.id);
                            return;
                          }
                          onViewCharge(item.id);
                        }}
                      >
                        <FileText className="size-3.5" />
                        {item.kind === 'invoice' ? 'View invoice' : 'View bill'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
