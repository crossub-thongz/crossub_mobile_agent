'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import {
  SERVICE_OFFER_KIND,
  clearServiceOfferFocus,
  fetchQuoteOffer,
  fetchServiceRecommendations,
  focusServiceOffer,
  onServiceOffersChanged,
  type QuoteOffer,
  type ServiceRecommendations,
} from '@/lib/crossub-api/service-offer-client';
import type { MaintenanceRequest } from '@/lib/types';

export type QuoteMatch = { id: string; offer: QuoteOffer };

export type RecommendationPicture = {
  recommendations: ServiceRecommendations | null;
  quotes: QuoteMatch[];
};

const EMPTY: RecommendationPicture = { recommendations: null, quotes: [] };

let snapshot: RecommendationPicture | null = null;
let snapshotKey = '';
let chain: Promise<void> = Promise.resolve();

function closedJob(job: MaintenanceRequest): boolean {
  const status = (job.apiStatus ?? job.status).toLowerCase();
  return status === 'completed' || status === 'cancelled' || status === 'closed';
}

/**
 * The server shows one offer at a time. Read the inspection offer first, then the quote
 * offer, then release the hold so Maintenance, Inspections, Home and CROS can each
 * decide what to render.
 */
function loadPicture(key: string, jobIds: string[]): Promise<void> {
  if (snapshot && snapshotKey === key) return Promise.resolve();
  const run = chain.then(async () => {
    if (snapshot && snapshotKey === key) return;
    await clearServiceOfferFocus().catch(() => undefined);
    let recommendations: ServiceRecommendations | null = null;
    try {
      recommendations = await fetchServiceRecommendations();
    } catch {
      recommendations = null;
    }
    let quotes: QuoteMatch[] = [];
    if (jobIds.length > 0) {
      try {
        await focusServiceOffer(SERVICE_OFFER_KIND.QUOTE);
      } catch {
        // The quote read still says whether the job can show the card.
      }
      const found = await Promise.all(
        jobIds.map(async (id) => {
          try {
            return { id, offer: await fetchQuoteOffer(id) };
          } catch {
            return null;
          }
        }),
      );
      quotes = found.filter(
        (row): row is QuoteMatch => row != null && row.offer.showModal && !row.offer.deferForUrgent,
      );
      await clearServiceOfferFocus().catch(() => undefined);
    }
    snapshot = { recommendations, quotes };
    snapshotKey = key;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function invalidateRecommendationPicture(): void {
  snapshot = null;
  snapshotKey = '';
}

/** Inspection and quote offers for the signed-in Self-Manage portfolio. */
export function useRecommendationPicture(pinJobId?: string): {
  picture: RecommendationPicture;
  ready: boolean;
} {
  const { maintenanceAll } = useAgentData();
  const selfManagedIds = useSelfManagedPropertyIds();
  const jobIds = useMemo(() => {
    const open = (maintenanceAll ?? []).filter(
      (job) => selfManagedIds.has(job.propertyId) && !closedJob(job),
    );
    const ids = open.map((job) => job.id);
    if (pinJobId && !ids.includes(pinJobId)) ids.unshift(pinJobId);
    return ids.slice(0, 8);
  }, [maintenanceAll, pinJobId, selfManagedIds]);
  const key = jobIds.join(',');
  const cached = snapshot && snapshotKey === key ? snapshot : null;
  const [picture, setPicture] = useState<RecommendationPicture>(cached ?? EMPTY);
  const [ready, setReady] = useState(cached != null);
  const [revision, setRevision] = useState(0);

  useEffect(() => onServiceOffersChanged(() => {
    invalidateRecommendationPicture();
    setRevision((value) => value + 1);
  }), []);

  useEffect(() => {
    let cancelled = false;
    void loadPicture(key, jobIds)
      .then(() => {
        if (!cancelled && snapshot) {
          setPicture(snapshot);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [jobIds, key, revision]);

  return { picture, ready };
}
