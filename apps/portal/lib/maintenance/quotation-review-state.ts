import type { ApiQuotation, QuotationReviewRecord } from '@/lib/crossub-api/types';

export const REQUOTED_STATUS_CLASS =
  'bg-yellow-700/15 text-yellow-900 dark:bg-yellow-700/25 dark:text-yellow-200';

export function latestCounterOffer(review?: QuotationReviewRecord) {
  const offers = review?.counterOffers ?? [];
  if (offers.length === 0) return undefined;
  return [...offers].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  )[0];
}

export function latestAgentCounterOffer(review?: QuotationReviewRecord) {
  const latest = latestCounterOffer(review);
  return latest?.sentBy === 'agent' ? latest : undefined;
}

function contractorRespondedAfterCounter(
  review: QuotationReviewRecord,
  counterSentAt: string,
): boolean {
  if (review.contractorRequotedAt) {
    return new Date(review.contractorRequotedAt).getTime() >= new Date(counterSentAt).getTime();
  }
  return false;
}

export function hasPendingAgentCounterOffer(
  review?: QuotationReviewRecord,
  decision?: QuotationReviewRecord['decision'],
): boolean {
  if (decision) return false;
  const latestAgent = latestAgentCounterOffer(review);
  if (!latestAgent) return false;
  if (!review) return true;
  return !contractorRespondedAfterCounter(review, latestAgent.sentAt);
}

export function isContractorRequotedAwaitingAgent(
  review?: QuotationReviewRecord,
  submittedQuote?: ApiQuotation,
): boolean {
  if (!review?.contractorRequotedAt || review.decision) return false;
  if (!submittedQuote || submittedQuote.status !== 'submitted') return false;
  const requotedAt = new Date(review.contractorRequotedAt).getTime();
  const quoteAt = new Date(submittedQuote.submittedAt).getTime();
  if (review.contractorRequoteQuotationId) {
    return review.contractorRequoteQuotationId === submittedQuote.id;
  }
  return quoteAt >= requotedAt;
}
