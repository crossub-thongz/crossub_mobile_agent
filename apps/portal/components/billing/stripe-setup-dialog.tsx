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
import { confirmAgentPaymentMethodSetup } from '@/lib/crossub-api/agent-billing-client';
import {
  getStripeBillingAppearance,
  STRIPE_BILLING_PAYMENT_ELEMENT_OPTIONS,
} from '@/lib/stripe-elements-config';
import { getStripe, getStripePublishableKey } from '@/lib/stripe-client';
import { cn } from '@/lib/utils';

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

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message ?? 'Could not validate card details');
        return;
      }

      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/bill?setup=return`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message ?? 'Could not save payment method');
        return;
      }

      if (
        setupIntent?.status === 'succeeded' ||
        setupIntent?.status === 'processing'
      ) {
        await confirmAgentPaymentMethodSetup(setupIntent.id);
        await onSuccess();
        onCancel();
        return;
      }

      setError(
        setupIntent?.status
          ? `Card setup did not complete (${setupIntent.status}). Try again.`
          : 'Card setup did not complete. Try again.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save payment method');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
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
          <span>
            Card details are encrypted and stored by Stripe. CROSSUB never sees your full card
            number.
          </span>
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
      <DialogContent
        className={cn(
          'flex max-h-[min(92vh,820px)] flex-col gap-0 overflow-hidden p-0',
          'w-[calc(100%-1.5rem)] sm:max-w-xl',
        )}
      >
        <DialogHeader className="space-y-2 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">Add payment method</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Save a default card for CROSSUB platform bills — inspections, tribunal, and monthly
            invoices.
          </DialogDescription>
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
            <SetupForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
