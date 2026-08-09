import { toast } from 'sonner';

import { getStripePublishableKey } from '@/lib/stripe-client';
import type { StripePaymentDialogState } from '@/components/billing/stripe-payment-dialog';
import type { AgentBillingDefaultPaymentMethod } from '@/lib/crossub-api/agent-billing-client';

export type PayIntentResult = {
  paymentComplete: boolean;
  clientSecret?: string | null;
  customerSessionClientSecret?: string | null;
  preferSavedCard?: boolean;
};

export type PaymentFlowDialogInput = Omit<
  StripePaymentDialogState,
  'clientSecret' | 'customerSessionClientSecret' | 'preferSavedCard'
> & {
  defaultPaymentMethod?: AgentBillingDefaultPaymentMethod | null;
};

export function resolvePaymentFlow(
  result: PayIntentResult,
  dialog: PaymentFlowDialogInput,
  setPaymentDialog: (state: StripePaymentDialogState | null) => void,
): 'complete' | 'dialog' | 'failed' {
  if (result.paymentComplete) return 'complete';

  if (result.clientSecret) {
    setPaymentDialog({
      ...dialog,
      clientSecret: result.clientSecret,
      customerSessionClientSecret: result.customerSessionClientSecret ?? null,
      preferSavedCard: result.preferSavedCard ?? Boolean(dialog.defaultPaymentMethod?.id),
    });
    return 'dialog';
  }

  if (!getStripePublishableKey()) {
    toast.error('Card payments are not configured on this environment.');
  } else {
    toast.error('Could not start payment. Try again or contact CROSSUB support.');
  }
  return 'failed';
}
