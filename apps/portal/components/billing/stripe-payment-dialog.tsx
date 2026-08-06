'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';
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
import {
  getStripeBillingAppearance,
  STRIPE_BILLING_PAYMENT_ELEMENT_OPTIONS,
} from '@/lib/stripe-elements-config';
import { getStripe, getStripePublishableKey } from '@/lib/stripe-client';
import { cn, formatCurrency } from '@/lib/utils';

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
    <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Amount due
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">{formatCurrency(amountAud)}</p>
        </div>

        <div
          className={cn(
            'rounded-xl border border-border/80 bg-muted/25 p-4 sm:p-5',
            '[&_.StripeElement]:min-h-[280px]',
          )}
        >
          <PaymentElement options={STRIPE_BILLING_PAYMENT_ELEMENT_OPTIONS} />
        </div>

        <div className="text-muted-foreground mt-4 flex items-start gap-2 text-xs leading-relaxed">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>Secure card payment processed by Stripe.</span>
        </div>

        {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
      </div>

      <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={!stripe || !elements || submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
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
      <DialogContent
        className={cn(
          'flex max-h-[min(92vh,820px)] flex-col gap-0 overflow-hidden p-0',
          'w-[calc(100%-1.5rem)] sm:max-w-xl',
        )}
      >
        <DialogHeader className="space-y-2 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">{state?.title ?? 'Pay with card'}</DialogTitle>
          {state?.description ? (
            <DialogDescription className="text-sm leading-relaxed">{state.description}</DialogDescription>
          ) : (
            <DialogDescription className="text-sm leading-relaxed">
              Enter your card details to complete this platform bill payment.
            </DialogDescription>
          )}
        </DialogHeader>

        {!publishableKey ? (
          <p className="text-destructive px-6 py-5 text-sm">
            Card payments are not configured on this environment. Contact CROSSUB support.
          </p>
        ) : state?.clientSecret ? (
          <Elements
            key={state.clientSecret}
            stripe={getStripe()}
            options={{
              clientSecret: state.clientSecret,
              appearance: getStripeBillingAppearance(),
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
