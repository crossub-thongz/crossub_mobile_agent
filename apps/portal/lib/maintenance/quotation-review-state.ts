import type { ApiQuotation, QuotationReviewRecord } from '@/lib/crossub-api/types';
import { contractorIdsMatch } from '@/lib/maintenance/resolve-contractor-display';

export const REQUOTED_STATUS_CLASS =
  'bg-yellow-700/15 text-yellow-900 dark:bg-yellow-700/25 dark:text-yellow-200';

export type QuotationHistoryRow = Pick<
  ApiQuotation,
  'id' | 'maintenanceRequestId' | 'contractorId' | 'submittedAt' | 'status' | 'price'
>;

export function getContractorQuotationHistory<T extends QuotationHistoryRow>(
  quotations: T[],
  requestId: string,
  contractorId: string,
  currentQuoteId?: string,
): { current?: T; previous: T[] } {
  const matches = quotations
    .filter(
      (quote) =>
        quote.maintenanceRequestId === requestId &&
        contractorIdsMatch(quote.contractorId, contractorId),
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const current =
    (currentQuoteId ? matches.find((quote) => quote.id === currentQuoteId) : undefined) ??
    matches.find((quote) => quote.status === 'submitted') ??
    matches.find((quote) => quote.status === 'approved') ??
    matches[0];

  const previous = current ? matches.filter((quote) => quote.id !== current.id) : matches.slice(1);

  return { current, previous };
}

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
