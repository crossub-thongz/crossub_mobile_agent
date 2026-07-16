'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ApiQuotation, QuotationReviewRecord } from '@/lib/crossub-api/types';

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
  const [comments, setComments] = useState(quote.comments ?? '');
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [acting, setActing] = useState(false);

  const isBusy = busy || acting;
  const canAct = canReview && quote.status === 'submitted';
  const decision = review?.decision;
  const landlordSent = Boolean(review?.landlordEmailSentAt);
  const feedbackSent = Boolean(review?.contractorFeedbackSentAt);

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

  if (!canReview) return null;

  return (
    <div className="space-y-3 border-t pt-3">
      {canAct && !decision ? (
        <>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Optional notes or decline reason"
            className="min-h-[80px] resize-none text-xs"
            disabled={isBusy}
          />
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
                  const reason = comments.trim();
                  if (!reason) {
                    toast.error('Enter a decline reason in the comments field');
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
                  toast.success('Quote approved — send quotation to landlord when ready');
                })
              }
            >
              Approve
            </Button>
          </div>
        </>
      ) : null}

      {negotiateOpen && canAct && !decision ? (
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

      {decision === 'approved' && !landlordSent ? (
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

      {decision === 'approved' && landlordSent ? (
        <p className="text-muted-foreground text-xs">
          Quotation sent to landlord ·{' '}
          {new Date(review!.landlordEmailSentAt!).toLocaleString('en-AU')}
        </p>
      ) : null}

      {decision === 'declined' && !feedbackSent ? (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={isBusy}
              onClick={() =>
                void run(async () => {
                  await onSendFeedback(comments.trim() || review?.declineReason);
                  toast.success('Feedback sent to contractor');
                })
              }
            >
              Send feedback to contractor
            </Button>
          </div>
        </div>
      ) : null}

      {decision === 'declined' && feedbackSent ? (
        <p className="text-muted-foreground text-xs">
          Feedback sent to contractor ·{' '}
          {new Date(review!.contractorFeedbackSentAt!).toLocaleString('en-AU')}
        </p>
      ) : null}
    </div>
  );
}
