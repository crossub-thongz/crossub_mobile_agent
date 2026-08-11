'use client';

import { CreditCard } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  PlatformChargeDetailDialog,
  type PlatformChargeDetailDialogState,
} from '@/components/billing/platform-charge-detail-dialog';
import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import { loadInspectionPlatformCharge } from '@/lib/billing/load-inspection-platform-charge';
import type { BillableInspectionType } from '@/lib/billing/resolve-billing-inspection-id';
import type { AgentBillingCharge } from '@/lib/crossub-api/agent-billing-client';
import { useLivePoll } from '@/lib/use-live-poll';
import { cn } from '@/lib/utils';

function isViewablePayment(charge: AgentBillingCharge | null | undefined): boolean {
  if (!charge) return false;
  return (
    charge.status === 'paid' ||
    charge.status === 'accrued' ||
    charge.status === 'invoiced'
  );
}

type InspectionViewPaymentButtonProps = {
  inspectionId: string;
  propertyId?: string;
  inspectionType?: BillableInspectionType;
  poolInspectionId?: string;
  viewingSessionId?: string;
  /** When false, skip loading (e.g. cancelled cases). */
  active?: boolean;
  className?: string;
};

/**
 * Header link next to “View property” — opens the paid/settled platform charge receipt.
 */
export function InspectionViewPaymentButton({
  inspectionId,
  propertyId,
  inspectionType,
  poolInspectionId,
  viewingSessionId,
  active = true,
  className,
}: InspectionViewPaymentButtonProps) {
  const [charge, setCharge] = useState<AgentBillingCharge | null>(null);
  const [dialog, setDialog] = useState<PlatformChargeDetailDialogState>(null);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);

  const load = useCallback(async () => {
    if (!active || !inspectionId.trim()) {
      setCharge(null);
      return;
    }
    try {
      const { charge: linked } = await loadInspectionPlatformCharge({
        inspectionId,
        propertyId,
        inspectionType,
        poolInspectionId,
        viewingSessionId,
      });
      setCharge(linked);
    } catch {
      setCharge(null);
    }
  }, [
    active,
    inspectionId,
    inspectionType,
    poolInspectionId,
    propertyId,
    viewingSessionId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useLivePoll(load, active);

  if (!isViewablePayment(charge)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog({ charge })}
        className={cn(
          'text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline',
          className,
        )}
      >
        <CreditCard className="size-3" />
        View payment
      </button>

      <PlatformChargeDetailDialog
        state={dialog}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        onPaid={async () => {
          setDialog(null);
          await load();
        }}
        paymentDialog={paymentDialog}
        setPaymentDialog={setPaymentDialog}
      />

      <StripePaymentDialog
        state={paymentDialog}
        open={paymentDialog != null}
        onOpenChange={(open) => {
          if (!open) setPaymentDialog(null);
        }}
        onSuccess={async () => {
          setPaymentDialog(null);
          setDialog(null);
          await load();
        }}
      />
    </>
  );
}
