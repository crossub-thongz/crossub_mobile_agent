'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import { StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { INSPECTION_CROSSUB_QUERY, ROUTES } from '@/constants/routes';
import { CROSSUB_INSPECTOR_COPY as COPY } from '@/constants/self-managed-inspections';
import { useSelfManagedInspection } from '@/hooks/use-self-managed-inspection';
import { prepareCrossubInspectorPayment } from '@/lib/billing/crossub-inspector-payment';
import { finalizeBillingChargePayment } from '@/lib/billing/finalize-billing-payment';
import { orderCrossubInspector } from '@/lib/crossub-api/agent-inspection-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Self-Manage: give this unbooked job of the agency's own to a CROSSUB inspector, paid by card at
 * the Inspection Only rate. Shown only while the server offers it (`canUseCrossubInspector`);
 * the recommendation card links here with `?crossub=1`, which scrolls to and marks the step.
 */
export function CrossubInspectorStep({
  inspectionId,
  onChanged,
}: {
  inspectionId: string;
  onChanged?: () => void;
}) {
  const { detail, busy, run } = useSelfManagedInspection(inspectionId, onChanged);
  const requested = useSearchParams().get(INSPECTION_CROSSUB_QUERY) != null;
  const [paying, setPaying] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const offered = Boolean(detail?.canUseCrossubInspector);

  useEffect(() => {
    if (requested && offered) anchor.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [requested, offered]);

  if (!offered) return null;

  const order = (chargeId: string | null) =>
    run(() => orderCrossubInspector(inspectionId, chargeId), COPY.done);

  const start = async () => {
    setPaying(true);
    try {
      const prepared = await prepareCrossubInspectorPayment(inspectionId);
      if (prepared.status === 'needs_card') {
        setPaymentDialog(prepared.dialog);
        return;
      }
      await order(prepared.chargeId);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const onPaid = async () => {
    const chargeId = paymentDialog?.chargeId;
    setPaymentDialog(null);
    if (!chargeId) return;
    setPaying(true);
    try {
      await finalizeBillingChargePayment(chargeId);
      toast.success(COPY.paid);
      await order(chargeId);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div ref={anchor}>
      <StepCard title={COPY.title} hint={COPY.hint} tone={requested ? 'attention' : 'default'}>
        <p className="text-muted-foreground text-[12px]">
          {COPY.payment}{' '}
          <Link href={ROUTES.PRICING} className="text-primary font-medium underline-offset-2 hover:underline">
            {COPY.pricingLink}
          </Link>
        </p>
        <Button size="sm" disabled={busy || paying} onClick={() => void start()}>
          {COPY.action}
        </Button>
      </StepCard>
      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPaymentDialog(null);
        }}
        onSuccess={() => void onPaid()}
      />
    </div>
  );
}
