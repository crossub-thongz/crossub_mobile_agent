'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Wrench } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SELF_MANAGED_MAINTENANCE_COPY as COPY } from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import { requestCrossubMaintenanceQuote } from '@/lib/crossub-api/maintenance-client';
import {
  dismissQuoteOffer,
  fetchQuoteOffer,
  focusServiceOffer,
  notifyServiceOffersChanged,
  QUOTE_CHOICE,
  SERVICE_OFFER_KIND,
  snoozeQuoteOffer,
  type QuoteOffer,
} from '@/lib/crossub-api/service-offer-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Crossub Assistance, shown when the agent reaches quoting and the server allows the modal.
 * Asking for the quote does not create a charge. Snooze and dismiss are stored on the job.
 */
export function QuoteAssistanceDialog({
  requestId,
  busy,
  run,
}: {
  requestId: string;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const [offer, setOffer] = useState<QuoteOffer | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetchQuoteOffer(requestId)
      .then((next) => {
        setOffer(next);
        if (next.showModal && !next.deferForUrgent) {
          setOpen(true);
          void focusServiceOffer(SERVICE_OFFER_KIND.QUOTE)
            .then(() => notifyServiceOffersChanged())
            .catch(() => undefined);
        }
      })
      .catch(() => setOffer(null));
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!offer || offer.deferForUrgent) return null;

  const declineOffer = async () => {
    try {
      await dismissQuoteOffer(requestId);
      notifyServiceOffersChanged();
      setOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const later = async () => {
    try {
      await snoozeQuoteOffer(requestId);
      notifyServiceOffersChanged();
      setOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const useCrossub = () => {
    void run(() => requestCrossubMaintenanceQuote(requestId), COPY.crossubRequested).then((ok) => {
      if (!ok) return;
      setOpen(false);
      load();
    });
  };

  const choices = offer.choices;
  const showPreferred = choices.includes(QUOTE_CHOICE.PREFERRED_TRADIE);
  const showCrossub = choices.includes(QUOTE_CHOICE.CROSSUB_ASSISTANCE) || choices.length === 0;

  return (
    <>
      {offer.lightweightEntry && offer.lightweightLabel ? (
        <button
          type="button"
          className="text-primary text-sm font-semibold underline-offset-2 hover:underline"
          onClick={() => setOpen(true)}
        >
          {offer.lightweightLabel}
        </button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Wrench className="text-muted-foreground size-4" />
              <span className="rounded-full bg-[#e7f8f2] px-2.5 py-0.5 text-xs font-semibold text-[#067a56]">
                {offer.offerName || 'Crossub Assistance'}
              </span>
            </div>
            <DialogTitle>Need help getting a quote?</DialogTitle>
            <DialogDescription>
              Crossub can help you arrange a qualified tradie to inspect the issue and provide a quote, saving you time and effort.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-[#067a56]" />
              We coordinate with the tradie on your behalf
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-[#067a56]" />
              Receive and review the quote in Crossub
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-[#067a56]" />
              You remain in control of the approval
            </li>
          </ul>
          <p className="text-muted-foreground text-sm">
            Service fees, if applicable, will be clearly shown before confirmation.
          </p>
          <div className="flex flex-col gap-2">
            {showCrossub ? (
              <Button disabled={busy} onClick={useCrossub}>
                Get a Quote with Crossub
              </Button>
            ) : null}
            {showPreferred ? (
              <Button variant="outline" disabled={busy} onClick={() => void declineOffer()}>
                Use My Preferred Tradie
              </Button>
            ) : null}
            <Button variant="outline" disabled={busy} onClick={() => void declineOffer()}>
              I&apos;ll arrange my own quote
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => void later()}>
              Remind me later
            </Button>
          </div>
          <p className="text-muted-foreground text-center text-sm">
            You can always request assistance later.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
