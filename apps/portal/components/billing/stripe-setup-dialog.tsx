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
import { confirmAgentPaymentMethodSetup } from '@/lib/crossub-api/agent-billing-client';
import { getStripe, getStripePublishableKey } from '@/lib/stripe-client';

export type StripeSetupDialogState = {
  clientSecret: string;
};

type SetupFormProps = {
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
};

function SetupForm({ onSuccess, onCancel }: SetupFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bill?setup=return`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Could not save payment method');
      setSubmitting(false);
      return;
    }

    if (setupIntent?.status === 'succeeded') {
      try {
        await confirmAgentPaymentMethodSetup(setupIntent.id);
        await onSuccess();
        onCancel();
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save payment method');
        setSubmitting(false);
        return;
      }
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
          Save payment method
        </Button>
      </DialogFooter>
    </form>
  );
}

type StripeSetupDialogProps = {
  state: StripeSetupDialogState | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
};

export function StripeSetupDialog({ state, onOpenChange, onSuccess }: StripeSetupDialogProps) {
  const publishableKey = getStripePublishableKey();
  const open = state != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add payment method</DialogTitle>
          <DialogDescription>
            Save a default card for CROSSUB platform bills. Your card details are stored securely
            by Stripe.
          </DialogDescription>
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
            <SetupForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
