import { apiV1 } from '@/lib/api';

/** What Cros, Home and Inspection may show. The server decides; the page does not. */
export const SERVICE_OFFER_KIND = {
  INSPECTION: 'INSPECTION',
  FULL_SERVICE: 'FULL_SERVICE',
  QUOTE: 'QUOTE',
} as const;

export type ServiceOfferKind = (typeof SERVICE_OFFER_KIND)[keyof typeof SERVICE_OFFER_KIND];

export const RECOMMENDATION_BUTTON = {
  ARRANGE_INSPECTIONS: 'arrange_inspections',
  EXPLORE_FULL_SERVICE: 'explore_full_service',
} as const;

export type RecommendationButton =
  (typeof RECOMMENDATION_BUTTON)[keyof typeof RECOMMENDATION_BUTTON];

export const QUOTE_CHOICE = {
  PREFERRED_TRADIE: 'preferred_tradie',
  CROSSUB_ASSISTANCE: 'crossub_assistance',
} as const;

export type QuoteChoice = (typeof QUOTE_CHOICE)[keyof typeof QUOTE_CHOICE];

export const OFFER_SUBJECT = {
  INSPECTION: 'INSPECTION',
  ROUTINE_SCHEDULE: 'ROUTINE_SCHEDULE',
} as const;

export type OfferSubject = (typeof OFFER_SUBJECT)[keyof typeof OFFER_SUBJECT];

export const FULL_SERVICE_REQUEST_STATUS = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  DECLINED: 'DECLINED',
} as const;

export type FullServiceRequestStatus =
  (typeof FULL_SERVICE_REQUEST_STATUS)[keyof typeof FULL_SERVICE_REQUEST_STATUS];

export type ServiceOfferInspection = {
  subjectType: OfferSubject | string;
  subjectId: string;
  propertyId: string;
  address: string;
  dueOn: string;
  buttons: RecommendationButton[];
};

export type ServiceRecommendations = {
  kind: ServiceOfferKind | null;
  cros: { buttons: RecommendationButton[] } | null;
  inspections: ServiceOfferInspection[];
  home: { buttons: RecommendationButton[] } | null;
  fullService: { feeSummary: string; termsSummary: string } | null;
};

export type FullServiceApplication = {
  id: string;
  status: FullServiceRequestStatus | string;
  feeSummary: string | null;
  termsSummary: string | null;
  requestedEffectiveDate: string | null;
  effectiveDate: string | null;
  declineReason: string | null;
  propertyIds: string[];
  serviceLevelUnchanged: boolean;
};

export type FullServiceApplications = {
  offer: { feeSummary: string; termsSummary: string };
  requests: FullServiceApplication[];
};

export type QuoteOffer = {
  showModal: boolean;
  deferForUrgent: boolean;
  lightweightEntry: boolean;
  choices: QuoteChoice[];
  offerName: string;
  partnerName: string;
  lightweightLabel: string | null;
  confirmBeforePay: string;
  requested: boolean;
  feeExGstAud: number;
  feeIncGstAud: number;
};

const OFFERS_CHANGED = 'crossub-service-offers-changed';

/** Other open cards refetch after a snooze, dismiss, or a new offer takes the screen. */
export function notifyServiceOffersChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OFFERS_CHANGED));
}

export function onServiceOffersChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(OFFERS_CHANGED, listener);
  return () => window.removeEventListener(OFFERS_CHANGED, listener);
}

export function fetchServiceRecommendations(): Promise<ServiceRecommendations> {
  return apiV1.get<ServiceRecommendations>('/agent/service-recommendations');
}

export function focusServiceOffer(kind: ServiceOfferKind): Promise<{ kind: ServiceOfferKind | null }> {
  return apiV1.post('/agent/service-recommendations/focus', { kind });
}

export function snoozeServiceOffer(offer: Pick<ServiceOfferInspection, 'subjectType' | 'subjectId'>): Promise<{ snoozeUntil: string }> {
  const path =
    offer.subjectType === OFFER_SUBJECT.ROUTINE_SCHEDULE
      ? `/agent/service-recommendations/schedules/${offer.subjectId}/snooze`
      : `/agent/service-recommendations/inspections/${offer.subjectId}/snooze`;
  return apiV1.post(path);
}

export function dismissServiceOffer(offer: Pick<ServiceOfferInspection, 'subjectType' | 'subjectId'>): Promise<{ dismissed: boolean }> {
  const path =
    offer.subjectType === OFFER_SUBJECT.ROUTINE_SCHEDULE
      ? `/agent/service-recommendations/schedules/${offer.subjectId}/dismiss`
      : `/agent/service-recommendations/inspections/${offer.subjectId}/dismiss`;
  return apiV1.post(path);
}

export function fetchFullServiceApplications(): Promise<FullServiceApplications> {
  return apiV1.get<FullServiceApplications>('/agent/full-service-requests');
}

export function createFullServiceApplication(body: {
  propertyIds: string[];
  requestedEffectiveDate: string;
}): Promise<FullServiceApplication> {
  return apiV1.post<FullServiceApplication>('/agent/full-service-requests', body);
}

export function fetchQuoteOffer(requestId: string): Promise<QuoteOffer> {
  return apiV1.get<QuoteOffer>(`/agent/maintenance/${requestId}/quote-offer`);
}

export function snoozeQuoteOffer(requestId: string): Promise<{ snoozeUntil: string }> {
  return apiV1.post(`/agent/maintenance/${requestId}/quote-offer/snooze`);
}

export function dismissQuoteOffer(requestId: string): Promise<{ dismissed: boolean }> {
  return apiV1.post(`/agent/maintenance/${requestId}/quote-offer/dismiss`);
}
