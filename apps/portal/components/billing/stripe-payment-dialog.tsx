'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getStripe, getStripePublishableKey } from '@/lib/stripe-client';
import { formatCurrency } from '@/lib/utils';

export type StripePaymentDialogState = {
  clientSecret: string;
  title: string;
  description?: string;
  amountAud: number;
};

type PaymentFormProps = {
  amountAud: number;
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
};

function PaymentForm({ amountAud, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bill?payment=return`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed');
      setSubmitting(false);
      return;
    }

    if (
      paymentIntent?.status === 'succeeded' ||
      paymentIntent?.status === 'processing'
    ) {
      await onSuccess();
      onCancel();
      return;
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <DialogFooter className="gap-2 pt-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || !elements || submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Pay {formatCurrency(amountAud)}
        </Button>
      </DialogFooter>
    </form>
  );
}

type StripePaymentDialogProps = {
  state: StripePaymentDialogState | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
};

export function StripePaymentDialog({ state, onOpenChange, onSuccess }: StripePaymentDialogProps) {
  const publishableKey = getStripePublishableKey();
  const open = state != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state?.title ?? 'Pay with card'}</DialogTitle>
          {state?.description ? (
            <DialogDescription>{state.description}</DialogDescription>
          ) : (
            <DialogDescription>
              Secure card payment processed by Stripe.
            </DialogDescription>
          )}
        </DialogHeader>

        {!publishableKey ? (
          <p className="text-destructive text-sm">
            Card payments are not configured on this environment. Contact CROSSUB support.
          </p>
        ) : state?.clientSecret ? (
          <Elements
            key={state.clientSecret}
            stripe={getStripe()}
            options={{
              clientSecret: state.clientSecret,
              appearance: { theme: 'stripe' },
            }}
          >
            <PaymentForm
              amountAud={state.amountAud}
              onSuccess={onSuccess}
              onCancel={() => onOpenChange(false)}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
