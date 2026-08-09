'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import { Button } from '@/components/ui/button';
import { resolvePaymentFlow } from '@/lib/billing/resolve-payment-flow';
import {
  fetchAgentBillingSummary,
  fetchAgentInspectionPlatformCharge,
  payAgentBillingCharge,
  type AgentBillingCharge,
  type AgentBillingSummary,
} from '@/lib/crossub-api/agent-billing-client';
import { cn, formatCurrency } from '@/lib/utils';

const SERVICE_LABEL: Record<string, string> = {
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  routine_inspection: 'Routine inspection',
  open_inspection: 'Open inspection',
};

type InspectionPlatformPaymentPromptProps = {
  inspectionId: string;
  /** When true, show in-case payment (inspector accepted, job not yet complete). */
  active: boolean;
  /** Open the Stripe payment dialog as soon as the charge is ready (default true). */
  autoOpenPayment?: boolean;
  className?: string;
};

export function InspectionPlatformPaymentPrompt({
  inspectionId,
  active,
  autoOpenPayment = true,
  className,
}: InspectionPlatformPaymentPromptProps) {
  const [summary, setSummary] = useState<AgentBillingSummary | null>(null);
  const [charge, setCharge] = useState<AgentBillingCharge | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);

  const isPrepaidAgency = useCallback((billing: AgentBillingSummary | null, isLoading: boolean) => {
    const collectionMode = billing?.inspectionsCollectionMode;
    return (
      collectionMode === 'prepaid' || billing?.prepaidEnabled === true || (!billing && !isLoading)
    );
  }, []);

  const isAwaitingPrepaidPayment = useCallback(
    (linked: AgentBillingCharge | null, billing: AgentBillingSummary | null, isLoading: boolean) => {
      if (!isPrepaidAgency(billing, isLoading)) return false;
      if (linked?.status === 'paid') return false;
      return !linked || linked.status === 'awaiting_payment' || linked.collectionMode === 'prepaid';
    },
    [isPrepaidAgency],
  );

  const load = useCallback(async (): Promise<AgentBillingCharge | null> => {
    if (!active) {
      setCharge(null);
      setSummary(null);
      return null;
    }
    setLoading(true);
    try {
      const [billing, linked] = await Promise.all([
        fetchAgentBillingSummary(),
        fetchAgentInspectionPlatformCharge(inspectionId),
      ]);
      setSummary(billing);
      setCharge(linked);
      return linked;
    } catch {
      setCharge(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [active, inspectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [active, load]);

  const payNow = useCallback(async () => {
    let linked = charge;
    if (!linked || linked.status !== 'awaiting_payment') {
      linked = await load();
    }
    if (!linked || linked.status !== 'awaiting_payment') return;

    setPaying(true);
    try {
      const result = await payAgentBillingCharge(linked.id, { devConfirm: false });
      const label = SERVICE_LABEL[linked.serviceType] ?? 'Inspection';
      const outcome = resolvePaymentFlow(
        result,
        {
          title: `${label} — payment required`,
          description: linked.description,
          amountAud: linked.amount,
          defaultPaymentMethod: summary?.defaultPaymentMethod,
        },
        setPaymentDialog,
      );
      if (outcome === 'complete') {
        toast.success('Payment complete — thank you');
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  }, [charge, load, summary?.defaultPaymentMethod]);

  useEffect(() => {
    setPaymentDialog(null);
    setPaying(false);
  }, [inspectionId]);

  /** Open payment when the case is opened and the inspection is still unpaid. */
  useEffect(() => {
    if (!active || !autoOpenPayment || loading || paying || paymentDialog != null) return;
    if (!charge || charge.status !== 'awaiting_payment') return;
    if (!isAwaitingPrepaidPayment(charge, summary, loading)) return;
    void payNow();
  }, [
    active,
    autoOpenPayment,
    charge?.id,
    charge?.status,
    inspectionId,
    isAwaitingPrepaidPayment,
    loading,
    payNow,
    paymentDialog,
    paying,
    summary,
  ]);

  const handlePaymentDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      setPaymentDialog(null);
      if (!autoOpenPayment || paying) return;
      void (async () => {
        const linked = await load();
        if (linked?.status === 'awaiting_payment') {
          window.setTimeout(() => void payNow(), 200);
        }
      })();
    },
    [autoOpenPayment, load, payNow, paying],
  );

  if (!active) return null;

  if (loading && !summary && !charge) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm',
          className,
        )}
      >
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading payment details…
        </div>
      </section>
    );
  }

  const collectionMode = summary?.inspectionsCollectionMode;
  const prepaidAgency = isPrepaidAgency(summary, loading);
  const postpaidAgency = collectionMode === 'postpaid';

  if (summary && !prepaidAgency && !postpaidAgency) {
    return null;
  }

  if (postpaidAgency) {
    if (charge?.status === 'accrued') {
      return (
        <section
          className={cn(
            'rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm',
            className,
          )}
        >
          <p className="font-medium">Billed to your monthly invoice</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {formatCurrency(charge.amount)} for this inspection will appear on your next CROSSUB
            platform invoice.
          </p>
        </section>
      );
    }
    return null;
  }

  if (charge?.status === 'paid') {
    return (
      <section
        className={cn(
          'rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm',
          className,
        )}
      >
        <p className="font-medium text-emerald-800 dark:text-emerald-200">Inspection paid</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {formatCurrency(charge.amount)} received for this job.
        </p>
      </section>
    );
  }

  const awaitingPrepaid =
    !charge || charge.status === 'awaiting_payment' || charge.collectionMode === 'prepaid';

  if (!awaitingPrepaid) return null;

  const paymentDialogOpen = paymentDialog != null;

  return (
    <>
      {!paymentDialogOpen ? (
        <section
          className={cn(
            'rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4',
            className,
          )}
        >
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Payment required
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            The inspector has accepted this job. Pay the platform fee
            {charge ? ` (${formatCurrency(charge.amount)})` : ''} while this case is in progress.
            If you skip payment here, any outstanding balance will appear on the{' '}
            <Link href="/bill" className="text-primary font-medium hover:underline">
              Bill
            </Link>{' '}
            page once the job is complete.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void payNow()}
              disabled={paying || (loading && !charge)}
            >
              {paying || (loading && !charge) ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CreditCard className="size-3.5" />
              )}
              {charge ? `Pay ${formatCurrency(charge.amount)}` : 'Open payment'}
            </Button>
            {charge ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void load()}
                disabled={loading || paying}
              >
                Refresh
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {paying && !paymentDialogOpen ? (
        <section
          className={cn(
            'rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm',
            className,
          )}
        >
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Opening payment…
          </div>
        </section>
      ) : null}

      <StripePaymentDialog
        stacked
        state={paymentDialog}
        open={paymentDialogOpen}
        onOpenChange={handlePaymentDialogOpenChange}
        onSuccess={() => void load()}
      />
    </>
  );
}
