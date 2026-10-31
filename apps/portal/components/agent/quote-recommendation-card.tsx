'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { useRecommendationPicture } from '@/hooks/use-recommendation-picture';
import { requestCrossubMaintenanceQuote } from '@/lib/crossub-api/maintenance-client';
import {
  QUOTE_CHOICE,
  dismissQuoteOffer,
  notifyServiceOffersChanged,
  snoozeQuoteOffer,
} from '@/lib/crossub-api/service-offer-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

const COPY = {
  badge: 'Suggestion',
  title: 'Need help getting a quote?',
  body: 'Crossub can arrange a tradie to inspect the issue and quote, or you can arrange the quote yourself.',
  several: (count: number) =>
    `You have ${count} maintenance ${count === 1 ? 'job' : 'jobs'} that still need a quote.`,
  crossub: 'Get a Quote with Crossub',
  own: "I'll arrange my own quote",
  preferred: 'Use My Preferred Tradie',
  later: 'Remind me in 7 days',
  laterNote: 'You can always request assistance later.',
  requested: 'Crossub will arrange the quote. Any fee is shown before you confirm.',
};

/**
 * The maintenance quote offer, in the same suggestion card as an inspection.
 * Wayne's quote-offer API decides whether this job should see it.
 */
export function QuoteRecommendation({
  requestId,
  onAccepted,
}: {
  /** One job, on its task. Omit to use the first open Self-Manage job the API still offers. */
  requestId?: string;
  onAccepted?: () => void;
}) {
  const { maintenanceAll: maintenance } = useAgentData();
  const { picture, ready } = useRecommendationPicture(requestId);
  const [busy, setBusy] = useState(false);
  const open = requestId
    ? picture.quotes.filter((row) => row.id === requestId)
    : picture.quotes;
  const lead = open[0];

  if (!ready || !lead) return null;
  const match = { ...lead, extra: Math.max(0, open.length - 1) };

  const job = (maintenance ?? []).find((row) => row.id === match.id);
  const address = job?.propertyAddress;
  const issue = job?.title;
  const showPreferred = match.offer.choices.includes(QUOTE_CHOICE.PREFERRED_TRADIE);
  const ownLabel = showPreferred ? COPY.preferred : COPY.own;

  const finish = async (action: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await action();
      notifyServiceOffersChanged();
      if (done) toast.success(done);
      onAccepted?.();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-4 rounded-2xl border border-[#cfe8df] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold tracking-wide text-[#067a56] uppercase">
          CROS <span className="text-slate-400">·</span> {COPY.badge}
        </p>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 rounded-md p-1"
          aria-label="Not interested"
          disabled={busy}
          onClick={() => void finish(() => dismissQuoteOffer(match.id))}
        >
          <X className="size-4" />
        </button>
      </div>
      <h2 className="mt-1 text-base font-semibold text-slate-900">{COPY.title}</h2>
      {address ? <p className="mt-1 text-sm font-medium text-slate-800">{address}</p> : null}
      <p className="mt-1 text-sm text-slate-600">
        {match.extra > 0
          ? COPY.several(match.extra + 1)
          : issue
            ? `${issue} still needs a quote.`
            : COPY.body}
      </p>
      {match.extra === 0 && issue ? <p className="mt-1 text-sm text-slate-600">{COPY.body}</p> : null}
      {match.offer.confirmBeforePay ? (
        <p className="mt-2 text-xs text-slate-500">{match.offer.confirmBeforePay}</p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 items-stretch gap-2">
        <button
          type="button"
          className="flex min-h-10 items-center justify-center rounded-lg bg-[#00bd85] px-3 py-2 text-center text-sm leading-tight font-semibold text-white transition-colors hover:bg-[#00a876] disabled:opacity-50"
          disabled={busy}
          onClick={() =>
            void finish(() => requestCrossubMaintenanceQuote(match.id), COPY.requested)
          }
        >
          {COPY.crossub}
        </button>
        <button
          type="button"
          className="flex min-h-10 items-center justify-center rounded-lg border border-[#ccece3] bg-white px-3 py-2 text-center text-sm leading-tight font-semibold text-[#067a56] transition-colors hover:border-[#00bd85] hover:bg-[#f3fbf8] disabled:opacity-50"
          disabled={busy}
          onClick={() => void finish(() => dismissQuoteOffer(match.id))}
        >
          {ownLabel}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          className="text-xs font-semibold text-[#067a56] underline-offset-2 hover:underline"
          disabled={busy}
          onClick={() => void finish(() => snoozeQuoteOffer(match.id))}
        >
          {COPY.later}
        </button>
        <span className="text-xs text-slate-500">{COPY.laterNote}</span>
      </div>
    </section>
  );
}
