'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** When false, skip polling (e.g. job still pending acceptance). */
  active: boolean;
  className?: string;
};

export function InspectionPlatformPaymentPrompt({
  inspectionId,
  active,
  className,
}: InspectionPlatformPaymentPromptProps) {
  const [summary, setSummary] = useState<AgentBillingSummary | null>(null);
  const [charge, setCharge] = useState<AgentBillingCharge | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const promptedRef = useRef(false);

  const load = useCallback(async () => {
    if (!active) {
      setCharge(null);
      return;
    }
    setLoading(true);
    try {
      const [billing, linked] = await Promise.all([
        fetchAgentBillingSummary(),
        fetchAgentInspectionPlatformCharge(inspectionId),
      ]);
      setSummary(billing);
      setCharge(linked);
    } catch {
      setCharge(null);
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

  const payNow = useCallback(
    async (opts?: { auto?: boolean }) => {
      if (!charge || charge.status !== 'awaiting_payment') return;
      setPaying(true);
      try {
        const result = await payAgentBillingCharge(charge.id, { devConfirm: false });
        const label = SERVICE_LABEL[charge.serviceType] ?? 'Inspection';
        const outcome = resolvePaymentFlow(
          result,
          {
            title: `${label} — payment required`,
            description: charge.description,
            amountAud: charge.amount,
          },
          setPaymentDialog,
        );
        if (outcome === 'complete') {
          toast.success('Payment complete — thank you');
          await load();
        } else if (outcome === 'failed' && opts?.auto) {
          promptedRef.current = false;
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Payment failed');
      } finally {
        setPaying(false);
      }
    },
    [charge, load],
  );

  const needsPrepaidPayment =
    Boolean(summary?.prepaidEnabled) &&
    summary?.inspectionsCollectionMode === 'prepaid' &&
    charge?.status === 'awaiting_payment' &&
    charge.collectionMode === 'prepaid';

  useEffect(() => {
    if (!needsPrepaidPayment || promptedRef.current || paying || paymentDialog) return;
    promptedRef.current = true;
    void payNow({ auto: true });
  }, [needsPrepaidPayment, payNow, paying, paymentDialog]);

  if (!active || loading) return null;

  if (!summary?.prepaidEnabled) return null;

  if (summary.inspectionsCollectionMode === 'postpaid') {
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

  if (!needsPrepaidPayment) {
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
    return null;
  }

  return (
    <>
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
          The inspector has accepted this job. Pay the platform fee ({formatCurrency(charge!.amount)}
          ) to continue — or pay later from the{' '}
          <Link href="/bill" className="text-primary font-medium hover:underline">
            Bill
          </Link>{' '}
          page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void payNow()}
            disabled={paying || paymentDialog != null}
          >
            {paying ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CreditCard className="size-3.5" />
            )}
            Pay now
          </Button>
        </div>
      </section>

      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(open) => {
          if (!open) setPaymentDialog(null);
        }}
        onSuccess={() => void load()}
      />
    </>
  );
}
