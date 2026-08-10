'use client';

import Link from 'next/link';
import { CreditCard, Loader2, Receipt } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import {
  PlatformChargeDetailDialog,
  type PlatformChargeDetailDialogState,
} from '@/components/billing/platform-charge-detail-dialog';
import { StripePaymentDialog, type StripePaymentDialogState } from '@/components/billing/stripe-payment-dialog';
import { Button } from '@/components/ui/button';
import {
  fetchAgentBillingSummary,
  listAgentChargeHistory,
  type AgentBillingCharge,
  type AgentBillingDefaultPaymentMethod,
} from '@/lib/crossub-api/agent-billing-client';
import { ROUTES } from '@/constants/routes';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Full Service fee',
};

const STATUS_TONE: Record<string, string> = {
  paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  awaiting_payment: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  accrued: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  invoiced: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  refunded: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

function serviceLabel(raw: string): string {
  return SERVICE_LABEL[raw] ?? raw.replace(/_/g, ' ');
}

function statusLabel(raw: string): string {
  return raw.replace(/_/g, ' ');
}

export function PropertyBillsTab({ propertyId }: { propertyId: string }) {
  const [charges, setCharges] = useState<AgentBillingCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultPaymentMethod, setDefaultPaymentMethod] =
    useState<AgentBillingDefaultPaymentMethod | null>(null);
  const [chargeDialog, setChargeDialog] = useState<PlatformChargeDetailDialogState>(null);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, summary] = await Promise.all([
        listAgentChargeHistory(propertyId),
        fetchAgentBillingSummary().catch(() => null),
      ]);
      setCharges(rows);
      setDefaultPaymentMethod(summary?.defaultPaymentMethod ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load property bills');
      setCharges([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Bills</h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            CROSSUB platform charges for this property — status, amount paid, and how each fee was
            calculated. Pay outstanding items from the agency{' '}
            <Link href={ROUTES.BILL} className="text-primary font-medium hover:underline">
              Bill
            </Link>{' '}
            page.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {loading && charges.length === 0 ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading bills…
        </div>
      ) : charges.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No platform bills yet"
          description="Inspection and tribunal platform charges for this property will appear here after they are quoted or accepted."
        />
      ) : (
        <ul className="space-y-3">
          {charges.map((row) => {
            const paid = row.status === 'paid';
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() =>
                    setChargeDialog({
                      charge: row,
                      defaultPaymentMethod,
                    })
                  }
                  className="border-border/80 bg-card hover:border-primary/30 w-full rounded-2xl border p-4 text-left transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{serviceLabel(row.serviceType)}</p>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            STATUS_TONE[row.status] ?? 'border-border bg-muted text-muted-foreground',
                          )}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-snug">{row.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(row.amount)}
                      </p>
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                        {row.collectionMode === 'postpaid' ? 'Monthly invoice' : 'Prepaid'}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-3 grid gap-2 border-t border-border/60 pt-3 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="font-medium">{formatDate(row.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {paid ? 'Paid' : 'Payment'}
                      </dt>
                      <dd className="font-medium">
                        {paid && row.paidAt
                          ? formatDateTime(row.paidAt)
                          : paid
                            ? 'Paid'
                            : row.status === 'accrued'
                              ? 'Accrued — pay with monthly invoice'
                              : row.status === 'invoiced'
                                ? 'On monthly invoice'
                                : row.status === 'refunded'
                                  ? 'Refunded'
                                  : 'Not paid yet'}
                      </dd>
                    </div>
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
                </button>
              </li>
            );
          })}
        </ul>
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
