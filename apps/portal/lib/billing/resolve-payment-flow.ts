import { toast } from 'sonner';

import { getStripePublishableKey } from '@/lib/stripe-client';
import type { StripePaymentDialogState } from '@/components/billing/stripe-payment-dialog';

export type PayIntentResult = {
  paymentComplete: boolean;
  clientSecret?: string | null;
};

export function resolvePaymentFlow(
  result: PayIntentResult,
  dialog: Omit<StripePaymentDialogState, 'clientSecret'>,
  setPaymentDialog: (state: StripePaymentDialogState | null) => void,
): 'complete' | 'dialog' | 'failed' {
  if (result.paymentComplete) return 'complete';

  if (result.clientSecret) {
    setPaymentDialog({ ...dialog, clientSecret: result.clientSecret });
    return 'dialog';
  }

  if (!getStripePublishableKey()) {
    toast.error('Card payments are not configured on this environment.');
  } else {
    toast.error('Could not start payment. Try again or contact CROSSUB support.');
  }
  return 'failed';
}
