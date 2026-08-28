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
import { finalizeBillingChargePayment } from '@/lib/billing/finalize-billing-payment';
import {
  loadInspectionPlatformCharge,
  prepareInspectionPlatformCharge,
} from '@/lib/billing/load-inspection-platform-charge';
import type { BillableInspectionType } from '@/lib/billing/resolve-billing-inspection-id';
import { resolvePaymentFlow } from '@/lib/billing/resolve-payment-flow';
import {
  fetchAgentBillingSummary,
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
  poolInspectionId?: string;
  propertyId?: string;
  viewingSessionId?: string;
  inspectionType?: BillableInspectionType;
  active: boolean;
  className?: string;
};

export function InspectionPlatformPaymentPrompt({
  inspectionId,
  poolInspectionId,
  propertyId,
  viewingSessionId,
  inspectionType,
  active,
  className,
}: InspectionPlatformPaymentPromptProps) {
  const [summary, setSummary] = useState<AgentBillingSummary | null>(null);
  const [charge, setCharge] = useState<AgentBillingCharge | null>(null);
  const [billingInspectionId, setBillingInspectionId] = useState(inspectionId);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const payInFlightRef = useRef(false);
  const activeChargeIdRef = useRef<string | null>(null);

  const billingInspectionIdRef = useRef(billingInspectionId);
  billingInspectionIdRef.current = billingInspectionId;

  const load = useCallback(async (): Promise<AgentBillingCharge | null> => {
    if (!active) {
      setCharge(null);
      setSummary(null);
      return null;
    }
    if (!inspectionId.trim() && !viewingSessionId?.trim() && !propertyId?.trim()) {
      return null;
    }
    setLoading(true);
    try {
      const billing = await fetchAgentBillingSummary();
      setSummary(billing);

      const currentBillingId = billingInspectionIdRef.current;
      const { charge: linked, billingInspectionId: resolvedId } =
        await loadInspectionPlatformCharge({
          inspectionId: currentBillingId.trim() || inspectionId.trim(),
          poolInspectionId: poolInspectionId ?? currentBillingId,
          propertyId,
          viewingSessionId,
          inspectionType,
        });

      if (resolvedId) {
        setBillingInspectionId((prev) => (prev === resolvedId ? prev : resolvedId));
      }
      setCharge(linked);
      return linked;
    } catch (err) {
      setCharge(null);
      toast.error(err instanceof Error ? err.message : 'Could not load payment details');
      return null;
    } finally {
      setLoading(false);
    }
  }, [active, inspectionId, inspectionType, poolInspectionId, propertyId, viewingSessionId]);

  useEffect(() => {
    setBillingInspectionId(inspectionId);
  }, [inspectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const payNow = useCallback(async () => {
    if (payInFlightRef.current || paymentDialog) return;
    payInFlightRef.current = true;
    setPaying(true);
    try {
      let linked = charge;
      if (!linked || linked.status !== 'awaiting_payment') {
        const prepared = await prepareInspectionPlatformCharge({
          inspectionId: billingInspectionId.trim() || inspectionId.trim(),
          poolInspectionId: poolInspectionId ?? billingInspectionId,
          propertyId,
          viewingSessionId,
          inspectionType,
        });
        if (prepared.billingInspectionId !== billingInspectionId) {
          setBillingInspectionId(prepared.billingInspectionId);
        }
        linked = prepared.charge;
        setCharge(linked);
        if (!linked) {
          toast.error(
            prepared.error ??
              'Could not prepare payment for this inspection. Try again or pay from the Bill page.',
          );
          return;
        }
      }

      if (!linked) {
        toast.error(
          'Could not prepare payment for this inspection. Try again or pay from the Bill page.',
        );
        return;
      }

      activeChargeIdRef.current = linked.id;

      if (linked.status === 'paid') {
        toast.success('This inspection is already paid.');
        return;
      }

      if (linked.status !== 'awaiting_payment') {
        toast.message('This inspection is billed to your monthly invoice.');
        return;
      }

      const result = await payAgentBillingCharge(linked.id, { devConfirm: false });
      const label = SERVICE_LABEL[linked.serviceType] ?? 'Inspection';
      const outcome = resolvePaymentFlow(
        result,
        {
          title: `${label} — payment required`,
          description: linked.description,
          amountAud: linked.amount,
          calculationDetail: linked.calculationDetail,
          calculationSummary: linked.calculationSummary,
          defaultPaymentMethod: summary?.defaultPaymentMethod,
          chargeId: linked.id,
        },
        setPaymentDialog,
      );
      if (outcome === 'complete') {
        await finalizeBillingChargePayment(linked.id);
        toast.success('Payment complete — thank you');
        payInFlightRef.current = false;
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
      payInFlightRef.current = false;
    } finally {
      setPaying(false);
    }
  }, [
    billingInspectionId,
    charge,
    inspectionId,
    inspectionType,
    load,
    paymentDialog,
    poolInspectionId,
    propertyId,
    summary?.defaultPaymentMethod,
    viewingSessionId,
  ]);

  const handleStripeSuccess = useCallback(async () => {
    const chargeId = paymentDialog?.chargeId ?? activeChargeIdRef.current;
    await finalizeBillingChargePayment(chargeId);
    toast.success('Payment complete — thank you');
    payInFlightRef.current = false;
    setPaymentDialog(null);
    await load();
  }, [load, paymentDialog?.chargeId]);

  useEffect(() => {
    setPaymentDialog(null);
    setPaying(false);
    payInFlightRef.current = false;
    activeChargeIdRef.current = null;
  }, [inspectionId, billingInspectionId]);

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
  const prepaidAgency =
    collectionMode === 'prepaid' ||
    summary?.prepaidEnabled === true ||
    (!summary && !loading);
  const postpaidAgency = collectionMode === 'postpaid';

  if (summary?.platformBillingDisabled) {
    return null;
  }

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

  // Prompt stays until payment succeeds — then it is fully dismissed.
  // No linked charge (Level 3 opens, included $0, already paid) → hide.
  if (
    !charge ||
    charge.status === 'paid' ||
    charge.status === 'included' ||
    charge.status === 'accrued' ||
    charge.includedInAllowance ||
    Number(charge.amount) <= 0
  ) {
    return null;
  }

  if (charge.status !== 'awaiting_payment') return null;

  const paymentDialogOpen = paymentDialog != null;
  const staffOrdered = Boolean(charge.createdByName);

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
            {staffOrdered
              ? `CROSSUB created this inspection case${charge.createdByName ? ` (${charge.createdByName})` : ''}. Pay the platform fee`
              : 'Pay the platform fee'}
            {` (${formatCurrency(charge.amount)})`} to continue. The inspector confirm
            timer starts after payment. Unpaid fees also appear on the{' '}
            <Link href="/bill" className="text-primary font-medium hover:underline">
              Bill
            </Link>{' '}
            page.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void payNow()} disabled={paying || loading}>
              {paying ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CreditCard className="size-3.5" />
              )}
              {charge ? `Pay ${formatCurrency(charge.amount)}` : 'Pay now'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void load()}
              disabled={loading || paying}
            >
              Refresh
            </Button>
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
            Preparing payment…
          </div>
        </section>
      ) : null}

      <StripePaymentDialog
        state={paymentDialog}
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentDialog(null);
            payInFlightRef.current = false;
          }
        }}
        onSuccess={() => void handleStripeSuccess()}
      />
    </>
  );
}
