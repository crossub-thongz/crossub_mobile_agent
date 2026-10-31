'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import { requestCrossubMaintenanceQuote } from '@/lib/crossub-api/maintenance-client';
import {
  QUOTE_CHOICE,
  SERVICE_OFFER_KIND,
  dismissQuoteOffer,
  fetchQuoteOffer,
  focusServiceOffer,
  notifyServiceOffersChanged,
  snoozeQuoteOffer,
  type QuoteOffer,
} from '@/lib/crossub-api/service-offer-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import type { MaintenanceRequest } from '@/lib/types';

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

function closedJob(job: MaintenanceRequest): boolean {
  const status = (job.apiStatus ?? job.status).toLowerCase();
  return status === 'completed' || status === 'cancelled' || status === 'closed';
}

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
  const selfManagedIds = useSelfManagedPropertyIds();
  const [match, setMatch] = useState<{ id: string; offer: QuoteOffer; extra: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    const rows = maintenance ?? [];
    const jobs = requestId
      ? rows.filter((job) => job.id === requestId)
      : rows.filter((job) => selfManagedIds.has(job.propertyId) && !closedJob(job));
    const ids = (requestId ? [requestId] : jobs.map((job) => job.id)).slice(0, 8);
    if (ids.length === 0) {
      setMatch(null);
      return;
    }
    Promise.all(
      ids.map(async (id) => {
        try {
          return { id, offer: await fetchQuoteOffer(id) };
        } catch {
          return null;
        }
      }),
    )
      .then((rows) => {
        const open = rows.filter(
          (row): row is { id: string; offer: QuoteOffer } =>
            row != null && row.offer.showModal && !row.offer.deferForUrgent,
        );
        const lead = open[0];
        setMatch(lead ? { ...lead, extra: open.length - 1 } : null);
      })
      .catch(() => setMatch(null));
  }, [maintenance, requestId, selfManagedIds]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  useEffect(() => {
    const refresh = () => setReloadKey((key) => key + 1);
    window.addEventListener('crossub-service-offers-changed', refresh);
    return () => window.removeEventListener('crossub-service-offers-changed', refresh);
  }, []);

  useEffect(() => {
    if (!match) return;
    void focusServiceOffer(SERVICE_OFFER_KIND.QUOTE)
      .then(() => notifyServiceOffersChanged())
      .catch(() => undefined);
  }, [match?.id]);

  if (!match) return null;

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
      setReloadKey((key) => key + 1);
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
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            void finish(() => requestCrossubMaintenanceQuote(match.id), COPY.requested)
          }
        >
          {COPY.crossub}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void finish(() => dismissQuoteOffer(match.id))}
        >
          {ownLabel}
        </Button>
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
