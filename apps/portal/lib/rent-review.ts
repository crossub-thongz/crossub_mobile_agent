import type { RentReviewCase, TimelineEntry } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export type RentReviewDecision = {
  action: 'confirmed' | 'custom';
  amount?: number;
} | null;

export function isRentReviewDecided(
  review: RentReviewCase,
  decision?: RentReviewDecision,
): boolean {
  if (decision != null) return true;
  const status = review.status.toLowerCase();
  return status.includes('confirm') || status.includes('complete');
}

export function isRentReviewPendingApproval(
  review: RentReviewCase,
  decision?: RentReviewDecision,
): boolean {
  return review.requiresApproval && !isRentReviewDecided(review, decision);
}

function partyToActorRole(party: string): TimelineEntry['actorRole'] {
  const normalized = party.toLowerCase();
  if (normalized.includes('crossub')) return 'crossub';
  if (normalized.includes('tenant')) return 'tenant';
  if (normalized.includes('contractor')) return 'contractor';
  if (normalized.includes('system')) return 'system';
  return 'agent';
}

function negotiationTitle(entry: {
  party: string;
  amount: number;
  note?: string;
}): string {
  const note = entry.note?.toLowerCase() ?? '';
  if (note.includes('counter')) {
    return `${entry.party} counter offer — ${formatCurrency(entry.amount)}/wk`;
  }
  if (note.includes('declin') || note.includes('reject')) {
    return `${entry.party} declined proposed rent increase`;
  }
  return `${entry.party} proposed ${formatCurrency(entry.amount)}/wk`;
}

function hasTimelineAt(entries: TimelineEntry[], at: string): boolean {
  const target = new Date(at).getTime();
  return entries.some((entry) => new Date(entry.at).getTime() === target);
}

export function buildRentReviewTimeline(
  review: RentReviewCase,
  decision?: RentReviewDecision,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [...review.timeline];

  for (const [index, negotiation] of (review.negotiationHistory ?? []).entries()) {
    if (hasTimelineAt(entries, negotiation.at)) continue;
    entries.push({
      id: `negotiation-${index}`,
      at: negotiation.at,
      actor: negotiation.party,
      actorRole: partyToActorRole(negotiation.party),
      title: negotiationTitle(negotiation),
      detail: negotiation.note,
      source: 'system',
    });
  }

  const hasTenantCounter = entries.some((entry) =>
    entry.title.toLowerCase().includes('counter offer'),
  );
  if (review.tenantResponse === 'counter' && review.counterOffer && !hasTenantCounter) {
    const lastAt = entries.at(-1)?.at ?? review.reviewDue;
    entries.push({
      id: 'tenant-counter-offer',
      at: lastAt,
      actor: 'Tenant',
      actorRole: 'tenant',
      title: `Tenant counter offer — ${formatCurrency(review.counterOffer)}/wk`,
      source: 'app',
    });
  }

  const hasDecline = entries.some((entry) => entry.title.toLowerCase().includes('declined'));
  if (review.tenantResponse === 'rejected' && !hasDecline) {
    const lastAt = entries.at(-1)?.at ?? review.reviewDue;
    entries.push({
      id: 'tenant-declined',
      at: lastAt,
      actor: 'Tenant',
      actorRole: 'tenant',
      title: 'Tenant declined proposed rent increase',
      source: 'app',
    });
  }

  if (decision) {
    entries.push({
      id: 'agent-decision',
      at: new Date().toISOString(),
      actor: 'Agent',
      actorRole: 'agent',
      title:
        decision.action === 'confirmed'
          ? `Agent confirmed CROSSUB suggested ${formatCurrency(review.suggestedRent)}/wk`
          : `Agent proposed ${formatCurrency(decision.amount ?? 0)}/wk`,
      source: 'manual',
    });
  } else if (isRentReviewDecided(review)) {
    entries.push({
      id: 'rent-review-confirmed',
      at: entries.at(-1)?.at ?? review.reviewDue,
      actor: 'Agent',
      actorRole: 'agent',
      title: `Rent review confirmed — ${formatCurrency(review.suggestedRent ?? review.currentRent)}/wk`,
      source: 'system',
    });
  }

  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
