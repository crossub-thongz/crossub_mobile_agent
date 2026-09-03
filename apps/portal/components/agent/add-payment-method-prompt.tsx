'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  StripeSetupDialog,
  type StripeSetupDialogState,
} from '@/components/billing/stripe-setup-dialog';
import { Button } from '@/components/ui/button';
import { createAgentPaymentMethodSetup } from '@/lib/crossub-api/agent-billing-client';
import { getStripePublishableKey } from '@/lib/stripe-client';

const DEFAULT_DESCRIPTION =
  'Save a card so checkout is faster when you pay. We never charge it automatically — only when you tap Pay. This stays on screen until a payment method is saved.';

type AddPaymentMethodPromptProps = {
  open: boolean;
  onSaved: () => void;
  description?: string;
};

/**
 * Blocking overlay prompting the agent to save a default card.
 * Used globally for Level 1/2 and on the Invoice page for Level 3.
 */
export function AddPaymentMethodPrompt({
  open,
  onSaved,
  description = DEFAULT_DESCRIPTION,
}: AddPaymentMethodPromptProps) {
  const [setupDialog, setSetupDialog] = useState<StripeSetupDialogState | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const blockKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [open]);

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
    setSetupDialog(null);
    onSaved();
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[250] flex items-end justify-center bg-black/70 p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-payment-method-title"
      >
        <div className="relative w-full max-w-md rounded-xl border bg-card p-5 shadow-xl">
          <p className="text-primary text-xs font-semibold uppercase tracking-wide">
            Required to continue
          </p>
          <h2 id="add-payment-method-title" className="mt-1 text-lg font-semibold">
            Add a payment method
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
          {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
          <Button className="mt-5 w-full" disabled={starting} onClick={() => void startSetup()}>
            {starting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CreditCard className="size-4" />
            )}
            Add payment method
          </Button>
        </div>
      </div>
      <StripeSetupDialog
        state={setupDialog}
        dismissible={false}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSetupDialog(null);
        }}
        onSuccess={handleSaved}
      />
    </>
  );
}
