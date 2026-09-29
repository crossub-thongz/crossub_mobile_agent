'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ApiQuotation, QuotationReviewRecord } from '@/lib/crossub-api/types';
import { isContractorRequotedAwaitingAgent } from '@/lib/maintenance/quotation-review-state';
import { formatCurrency } from '@/lib/utils';

// Agents are all in Australia — never the browser's or the server's zone.
const SYDNEY_TZ = 'Australia/Sydney';

function formatSydney(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', { timeZone: SYDNEY_TZ });
}

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
              {offer.sentBy ?? 'agent'} · {formatSydney(offer.sentAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The agent's decision on a submitted quote — three choices (Daniel Zhou, 29 Sep 2026):
 * Approve, Reject, or Owner to Handle. Approve is one confirm: the agent's approval is the
 * approval, so there is no follow-up "send to landlord" step and no email back to the agent.
 * Negotiate was removed from this panel; the counter-offer history still shows when a quote
 * carries one.
 */
export function MaintenanceQuotationReviewActions({
  quote,
  review,
  canReview,
  busy = false,
  onReviewDecision,
  onSendFeedback,
  onOwnerToHandle,
}: {
  quote: ApiQuotation;
  review?: QuotationReviewRecord;
  canReview: boolean;
  busy?: boolean;
  onReviewDecision: (decision: 'approved' | 'declined', declineReason?: string) => Promise<void>;
  onSendFeedback: (message?: string) => Promise<void>;
  onOwnerToHandle: () => Promise<void>;
}) {
  const [declineReason, setDeclineReason] = useState(review?.declineReason ?? '');
  const [acting, setActing] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [ownerToHandleOpen, setOwnerToHandleOpen] = useState(false);

  const isBusy = busy || acting;
  const canAct = canReview && quote.status === 'submitted';
  // After approve, the board may expose an `approved` quote row before review.decision
  // rehydrates — still treat that as approved.
  const decision =
    review?.decision ?? (quote.status === 'approved' ? 'approved' : undefined);
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
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Rejection reason</p>
            <Textarea
              value={declineReason}
              inputKind="contractor_quote_note"
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Required if rejecting — contractor comments are shown above"
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
              onClick={() => setOwnerToHandleOpen(true)}
            >
              Owner to Handle
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
                    toast.error('Enter a rejection reason');
                    return;
                  }
                  await onReviewDecision('declined', reason);
                  toast.success('Quote rejected — send feedback to contractor when ready');
                })
              }
            >
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#5f9f6b] text-white hover:bg-[#4f8d5b]"
              disabled={isBusy}
              onClick={() => setApproveDialogOpen(true)}
            >
              Approve
            </Button>
          </div>
          <Dialog open={ownerToHandleOpen} onOpenChange={setOwnerToHandleOpen}>
            <DialogContent className="sm:max-w-md" stacked>
              <DialogHeader>
                <DialogTitle>Owner to Handle Maintenance</DialogTitle>
                <DialogDescription>
                  The owner will arrange and manage this maintenance directly. This task will be
                  closed and marked as Handled by Owner.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => setOwnerToHandleOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    void run(async () => {
                      await onOwnerToHandle();
                      setOwnerToHandleOpen(false);
                      toast.success('Job closed — the owner will handle this maintenance');
                    })
                  }
                >
                  Confirm
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogContent className="sm:max-w-md" stacked>
              <DialogHeader>
                <DialogTitle>Approve quote</DialogTitle>
                <DialogDescription>
                  Approve this quote for {formatCurrency(quote.price)}. The contractor is asked to
                  arrange a visit time with the tenant.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => setApproveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#5f9f6b] text-white hover:bg-[#4f8d5b]"
                  disabled={isBusy}
                  onClick={() =>
                    void run(async () => {
                      await onReviewDecision('approved');
                      setApproveDialogOpen(false);
                      toast.success('Quote approved');
                    })
                  }
                >
                  Approve
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}

      {canReview && decision === 'approved' ? (
        <p className="text-muted-foreground text-xs">
          Quote approved
          {review?.decidedAt ? ` · ${formatSydney(review.decidedAt)}` : ''}
        </p>
      ) : null}

      {canReview && decision === 'declined' && !feedbackSent ? (
        <div className="space-y-2">
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Feedback to contractor</p>
            <Textarea
              value={declineReason}
              inputKind="message"
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Optional — uses rejection reason if empty"
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
          {formatSydney(review!.contractorFeedbackSentAt!)}
        </p>
      ) : null}
    </div>
  );
}
