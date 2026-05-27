import type { MessageThread, RentReviewCase } from '@/lib/types';
import type { ThreadMessage } from '@/lib/types';

export interface ProfileHistoryItem {
  id: string;
  at: string;
  title: string;
  detail: string;
  href?: string;
  kind: 'message' | 'rent_review' | 'notification';
}

export function buildProfileHistory(input: {
  messages: MessageThread[];
  sentThreadMessages: Record<string, ThreadMessage[]>;
  rentReviewDecisions: Record<
    string,
    { action: 'confirmed' | 'custom'; amount?: number } | null
  >;
  rentReviews: RentReviewCase[];
}): ProfileHistoryItem[] {
  const items: ProfileHistoryItem[] = [];

  for (const [threadId, sent] of Object.entries(input.sentThreadMessages)) {
    const thread = input.messages.find((m) => m.id === threadId);
    for (const msg of sent) {
      items.push({
        id: msg.id,
        at: msg.at,
        title: thread ? `Message · ${thread.subject}` : 'Message sent',
        detail: msg.body.length > 120 ? `${msg.body.slice(0, 120)}…` : msg.body,
        href: thread ? `/messages/${thread.id}` : undefined,
        kind: 'message',
      });
    }
  }

  for (const [reviewId, decision] of Object.entries(input.rentReviewDecisions)) {
    if (!decision) continue;
    const review = input.rentReviews.find((r) => r.id === reviewId);
    items.push({
      id: `rent-${reviewId}`,
      at: new Date().toISOString(),
      title: review
        ? `Rent review · ${review.propertyAddress}`
        : 'Rent review decision',
      detail:
        decision.action === 'confirmed'
          ? `Agreed suggested rent for ${review?.propertyAddress ?? 'property'}`
          : `Proposed $${decision.amount ?? 0}/wk`,
      href: review ? `/rent-review/${review.id}` : undefined,
      kind: 'rent_review',
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at));
}
