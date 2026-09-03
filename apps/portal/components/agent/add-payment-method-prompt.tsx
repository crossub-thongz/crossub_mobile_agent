'use client';

import { CreditCard, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  StripeSetupDialog,
  type StripeSetupDialogState,
} from '@/components/billing/stripe-setup-dialog';
import { Button } from '@/components/ui/button';
import { createAgentPaymentMethodSetup } from '@/lib/crossub-api/agent-billing-client';
import { getStripePublishableKey } from '@/lib/stripe-client';

const DEFAULT_DESCRIPTION =
  'Save a card so checkout is faster when you pay. We never charge it automatically — only when you tap Pay.';

type AddPaymentMethodPromptProps = {
  open: boolean;
  onSaved: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
  description?: string;
};

/**
 * Overlay prompting the agent to save a default card.
 * Used globally for Level 1/2 after login until dismissed or a card is saved.
 */
export function AddPaymentMethodPrompt({
  open,
  onSaved,
  onDismiss,
  dismissible = false,
  description = DEFAULT_DESCRIPTION,
}: AddPaymentMethodPromptProps) {
  const [setupDialog, setSetupDialog] = useState<StripeSetupDialogState | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  const setupOpen = setupDialog != null;
  const showRecommendation = open && !setupOpen && !resolved;

  useEffect(() => {
    if (open) return;
    setSetupDialog(null);
    setStarting(false);
    setError(null);
    setResolved(false);
  }, [open]);

  useEffect(() => {
    if (!showRecommendation) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const blockKeys = (event: KeyboardEvent) => {
      if (!dismissible || setupOpen) return;
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
        onDismiss?.();
      }
    };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [dismissible, onDismiss, setupOpen, showRecommendation]);

  const startSetup = async () => {
    if (!getStripePublishableKey()) {
      setError('Card payments are not configured on this environment. Contact CROSSUB support.');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const { clientSecret } = await createAgentPaymentMethodSetup();
      setSetupDialog({ clientSecret, mode: 'add' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment method setup');
    } finally {
      setStarting(false);
    }
  };

  const handleSaved = () => {
    setResolved(true);
    setSetupDialog(null);
    onSaved();
  };

  if (!open && !setupOpen) {
    return null;
  }

  return (
    <>
      {showRecommendation ? (
      <div
        className="fixed inset-0 z-[250] flex items-end justify-center bg-black/70 p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-payment-method-title"
      >
        <div className="relative w-full max-w-md rounded-xl border bg-card p-5 shadow-xl">
          {dismissible ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground absolute right-3 top-3 rounded-lg p-1 transition-colors hover:bg-muted/60"
              aria-label="Close"
              onClick={() => onDismiss?.()}
            >
              <X className="size-4" />
            </button>
          ) : null}
          <p className="text-primary text-xs font-semibold uppercase tracking-wide">
            {dismissible ? 'Recommended' : 'Required to continue'}
          </p>
          <h2 id="add-payment-method-title" className="mt-1 text-lg font-semibold">
            Add a payment method
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
          {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
          <div className="mt-5 space-y-2">
            <Button className="w-full" disabled={starting} onClick={() => void startSetup()}>
              {starting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CreditCard className="size-4" />
              )}
              Add payment method
            </Button>
            {dismissible ? (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground w-full"
                disabled={starting}
                onClick={() => onDismiss?.()}
              >
                Not now
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      ) : null}
      <StripeSetupDialog
        state={setupDialog}
        dismissible={dismissible}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSetupDialog(null);
        }}
        onSuccess={handleSaved}
      />
    </>
  );
}
