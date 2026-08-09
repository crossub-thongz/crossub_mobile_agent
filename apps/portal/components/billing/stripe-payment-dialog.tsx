'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AgentBillingDefaultPaymentMethod } from '@/lib/crossub-api/agent-billing-client';
import {
  getStripeBillingAppearance,
  STRIPE_BILLING_CONFIRM_PARAMS,
  STRIPE_BILLING_PAYMENT_ELEMENT_OPTIONS,
} from '@/lib/stripe-elements-config';
import { getStripe, getStripePublishableKey } from '@/lib/stripe-client';
import { cn, formatCurrency } from '@/lib/utils';

export type StripePaymentDialogState = {
  clientSecret: string;
  title: string;
  description?: string;
  amountAud: number;
  defaultPaymentMethod?: AgentBillingDefaultPaymentMethod | null;
  customerSessionClientSecret?: string | null;
  preferSavedCard?: boolean;
};

type PaymentFormProps = {
  amountAud: number;
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
  onUseSavedCard?: () => void;
};

function formatCardBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatCardExpiry(expMonth: number, expYear: number): string {
  return `${String(expMonth).padStart(2, '0')}/${String(expYear).slice(-2)}`;
}

function PaymentForm({ amountAud, onSuccess, onCancel, onUseSavedCard }: PaymentFormProps) {
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

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/bill?payment=return`,
          ...STRIPE_BILLING_CONFIRM_PARAMS,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message ?? 'Payment failed');
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

      setError(
        paymentIntent?.status
          ? `Payment did not complete (${paymentIntent.status}). Try again.`
          : 'Payment did not complete. Try again.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
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
          {onUseSavedCard ? (
            <div className="mb-3 flex justify-end border-b pb-3">
              <button
                type="button"
                className="text-primary text-xs font-medium hover:underline"
                onClick={onUseSavedCard}
              >
                Back to saved card
              </button>
            </div>
          ) : null}
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

type SavedCardPaymentFormProps = {
  amountAud: number;
  clientSecret: string;
  defaultPaymentMethod: AgentBillingDefaultPaymentMethod;
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
  onUseDifferentCard: () => void;
  onChangePaymentMethod?: () => void | Promise<void>;
};

function SavedCardPaymentForm({
  amountAud,
  clientSecret,
  defaultPaymentMethod,
  onSuccess,
  onCancel,
  onUseDifferentCard,
  onChangePaymentMethod,
}: SavedCardPaymentFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payWithSavedCard = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const stripe = await getStripe();
      if (!stripe) {
        setError('Card payments are not configured on this environment.');
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          payment_method: defaultPaymentMethod.id,
          return_url: `${window.location.origin}/bill?payment=return`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message ?? 'Payment failed');
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

      setError(
        paymentIntent?.status
          ? `Payment did not complete (${paymentIntent.status}). Try again.`
          : 'Payment did not complete. Try again.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Amount due
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">{formatCurrency(amountAud)}</p>
        </div>

        <div className="rounded-xl border bg-muted/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Saved payment method
              </p>
              <p className="mt-2 text-sm font-semibold">
                {formatCardBrand(defaultPaymentMethod.brand)} ending in {defaultPaymentMethod.last4}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Expires {formatCardExpiry(defaultPaymentMethod.expMonth, defaultPaymentMethod.expYear)}
              </p>
            </div>
            <CreditCard className="size-5 shrink-0 text-muted-foreground" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3">
            {onChangePaymentMethod ? (
              <button
                type="button"
                className="text-primary text-xs font-medium hover:underline disabled:opacity-50"
                onClick={() => void onChangePaymentMethod()}
                disabled={submitting}
              >
                Change saved card
              </button>
            ) : null}
            <button
              type="button"
              className="text-primary text-xs font-medium hover:underline disabled:opacity-50"
              onClick={onUseDifferentCard}
              disabled={submitting}
            >
              Use another card for this payment
            </button>
          </div>
        </div>

        <div className="text-muted-foreground mt-4 flex items-start gap-2 text-xs leading-relaxed">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>Your saved card will be charged securely through Stripe.</span>
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
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => void payWithSavedCard()}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
          Pay {formatCurrency(amountAud)}
        </Button>
      </DialogFooter>
    </div>
  );
}

type StripePaymentDialogProps = {
  state: StripePaymentDialogState | null;
  /** When false, keeps state but hides the dialog (e.g. while updating saved card). */
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
  onChangePaymentMethod?: () => void | Promise<void>;
};

export function StripePaymentDialog({
  state,
  open: openOverride,
  onOpenChange,
  onSuccess,
  onChangePaymentMethod,
}: StripePaymentDialogProps) {
  const publishableKey = getStripePublishableKey();
  const open = openOverride ?? state != null;
  const [useAlternateCard, setUseAlternateCard] = useState(false);

  useEffect(() => {
    if (!open) setUseAlternateCard(false);
  }, [open, state?.clientSecret, state?.defaultPaymentMethod?.id]);

  const showSavedCard =
    Boolean(state?.defaultPaymentMethod?.id) &&
    state?.preferSavedCard !== false &&
    !useAlternateCard;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        stacked
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
              Complete this platform bill payment with your saved card or enter new card details.
            </DialogDescription>
          )}
        </DialogHeader>

        {!publishableKey ? (
          <p className="text-destructive px-6 py-5 text-sm">
            Card payments are not configured on this environment. Contact CROSSUB support.
          </p>
        ) : state?.clientSecret && showSavedCard && state.defaultPaymentMethod ? (
          <SavedCardPaymentForm
            amountAud={state.amountAud}
            clientSecret={state.clientSecret}
            defaultPaymentMethod={state.defaultPaymentMethod}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
            onUseDifferentCard={() => setUseAlternateCard(true)}
            onChangePaymentMethod={onChangePaymentMethod}
          />
        ) : state?.clientSecret ? (
          <Elements
            key={`${state.clientSecret}:${state.customerSessionClientSecret ?? 'none'}:${useAlternateCard ? 'alt' : 'default'}`}
            stripe={getStripe()}
            options={{
              clientSecret: state.clientSecret,
              appearance: getStripeBillingAppearance(),
              ...(state.customerSessionClientSecret
                ? { customerSessionClientSecret: state.customerSessionClientSecret }
                : {}),
            }}
          >
            <PaymentForm
              amountAud={state.amountAud}
              onSuccess={onSuccess}
              onCancel={() => onOpenChange(false)}
              onUseSavedCard={
                state.defaultPaymentMethod?.id ? () => setUseAlternateCard(false) : undefined
              }
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
