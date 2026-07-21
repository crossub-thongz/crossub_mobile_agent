'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ApiQuotation, QuotationReviewRecord } from '@/lib/crossub-api/types';
import { isContractorRequotedAwaitingAgent } from '@/lib/maintenance/quotation-review-state';
import { formatCurrency } from '@/lib/utils';

function CounterOfferHistory({
  offers,
}: {
  offers: NonNullable<QuotationReviewRecord['counterOffers']>;
}) {
  if (offers.length === 0) return null;

  const sorted = [...offers].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm font-medium">Counter offers</span>
        <span className="text-muted-foreground text-[11px]">
          {sorted.length} event{sorted.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="divide-y border-t px-4 py-1">
        {sorted.map((offer) => (
          <li key={offer.id} className="py-2.5 text-xs">
            <p className="font-medium tabular-nums">
              {formatCurrency(offer.counterPrice)}
              {offer.message ? ` — ${offer.message}` : ''}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {offer.sentBy ?? 'agent'} · {new Date(offer.sentAt).toLocaleString('en-AU')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MaintenanceQuotationReviewActions({
  quote,
  review,
  canReview,
  busy = false,
  onReviewDecision,
  onSendToLandlord,
  onSendFeedback,
  onCounterOffer,
}: {
  quote: ApiQuotation;
  review?: QuotationReviewRecord;
  canReview: boolean;
  busy?: boolean;
  onReviewDecision: (decision: 'approved' | 'declined', declineReason?: string) => Promise<void>;
  onSendToLandlord: () => Promise<void>;
  onSendFeedback: (message?: string) => Promise<void>;
  onCounterOffer: (counterPrice: number, message?: string) => Promise<void>;
}) {
  const [declineReason, setDeclineReason] = useState(review?.declineReason ?? '');
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [acting, setActing] = useState(false);

  const isBusy = busy || acting;
  const canAct = canReview && quote.status === 'submitted';
  // After approve, the board may expose an `approved` quote row before review.decision
  // rehydrates — still treat that as approved so Send to landlord remains available.
  const decision =
    review?.decision ?? (quote.status === 'approved' ? 'approved' : undefined);
  const landlordSent = Boolean(review?.landlordEmailSentAt);
  const feedbackSent = Boolean(review?.contractorFeedbackSentAt);
  const requotedAwaitingAgent = isContractorRequotedAwaitingAgent(review, quote);

  const run = async (fn: () => Promise<void>) => {
    setActing(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  if (!canReview && !(review?.counterOffers?.length)) return null;

  return (
    <div className="space-y-3 border-t pt-3">
      {requotedAwaitingAgent ? (
        <div className="rounded-md border border-yellow-700/30 bg-yellow-700/10 px-3 py-2">
          <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-200">
            Contractor requoted — review the revised quotation below
          </p>
        </div>
      ) : null}
      {review?.counterOffers?.length ? (
        <CounterOfferHistory offers={review.counterOffers} />
      ) : null}
      {canReview && canAct && !decision ? (
        <>
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Decline reason</p>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Required if declining — contractor comments are shown above"
              className="min-h-[80px] resize-none text-xs"
              disabled={isBusy}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => setNegotiateOpen((v) => !v)}
            >
              Requote
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={isBusy}
              onClick={() =>
                void run(async () => {
                  const reason = declineReason.trim();
                  if (!reason) {
                    toast.error('Enter a decline reason');
                    return;
                  }
                  await onReviewDecision('declined', reason);
                  toast.success('Quote declined — send feedback to contractor when ready');
                })
              }
            >
              Decline
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#5f9f6b] text-white hover:bg-[#4f8d5b]"
              disabled={isBusy}
              onClick={() =>
                void run(async () => {
                  await onReviewDecision('approved');
                  toast.success('Quote approved — quotation sent to landlord');
                })
              }
            >
              Approve
            </Button>
          </div>
        </>
      ) : null}

      {canReview && negotiateOpen && canAct && !decision ? (
        <div className="bg-muted/20 space-y-2 rounded-md border p-3">
          <p className="text-xs font-semibold">Requote (counter offer)</p>
          <input
            type="number"
            min={0}
            step="0.01"
            value={counterPrice}
            onChange={(e) => setCounterPrice(e.target.value)}
            placeholder="Counter price (AUD inc GST)"
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            disabled={isBusy}
          />
          <Textarea
            value={counterMessage}
            onChange={(e) => setCounterMessage(e.target.value)}
            placeholder="Optional message to contractor"
            className="min-h-[72px] resize-none text-xs"
            disabled={isBusy}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => setNegotiateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isBusy}
              onClick={() =>
                void run(async () => {
                  const price = Number(counterPrice);
                  if (!Number.isFinite(price) || price <= 0) {
                    toast.error('Enter a valid counter price');
                    return;
                  }
                  await onCounterOffer(price, counterMessage.trim() || undefined);
                  toast.success('Counter offer sent to contractor');
                  setNegotiateOpen(false);
                  setCounterPrice('');
                  setCounterMessage('');
                })
              }
            >
              Send counter offer
            </Button>
          </div>
        </div>
      ) : null}

      {canReview && decision === 'approved' && !landlordSent ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="bg-[#5f9f6b] text-white hover:bg-[#4f8d5b]"
            disabled={isBusy}
            onClick={() =>
              void run(async () => {
                await onSendToLandlord();
                toast.success('Quotation sent to landlord');
              })
            }
          >
            Send quotation to landlord
          </Button>
        </div>
      ) : null}

      {canReview && decision === 'approved' && landlordSent ? (
        <p className="text-muted-foreground text-xs">
          Quotation sent to landlord ·{' '}
          {new Date(review!.landlordEmailSentAt!).toLocaleString('en-AU')}
        </p>
      ) : null}

      {canReview && decision === 'declined' && !feedbackSent ? (
        <div className="space-y-2">
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Feedback to contractor</p>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Optional — uses decline reason if empty"
              className="min-h-[72px] resize-none text-xs"
              disabled={isBusy}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={isBusy}
              onClick={() =>
                void run(async () => {
                  await onSendFeedback(declineReason.trim() || review?.declineReason);
                  toast.success('Feedback sent to contractor');
                })
              }
            >
              Send feedback to contractor
            </Button>
          </div>
        </div>
      ) : null}

      {canReview && decision === 'declined' && feedbackSent ? (
        <p className="text-muted-foreground text-xs">
          Feedback sent to contractor ·{' '}
          {new Date(review!.contractorFeedbackSentAt!).toLocaleString('en-AU')}
        </p>
      ) : null}
    </div>
  );
}
