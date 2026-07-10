import { LEASE_RENEWAL_STAGES } from '@/lib/leasing-workflows/constants';
import type { RentReviewCase, TimelineEntry } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export type RentReviewDecision = {
  action: 'confirmed' | 'custom';
  amount?: number;
} | null;

/** Map API workflow state → 7-stage lease renewal rail (LEASE RENEWAL.pdf). */
export function resolveLeaseRenewalStageIndex(
  review: RentReviewCase,
  decision?: RentReviewDecision,
): number {
  if (decision) return 2;
  const state = review.workflowState;
  if (!state) {
    if (review.requiresApproval) return 2;
    if (review.tenantResponse === 'accepted') return 5;
    if (review.tenantResponse === 'pending') return 4;
    return 1;
  }
  switch (state) {
    case 'PENDING_CONFIRMATION':
      return 0;
    case 'AGENT_REVIEW':
      return 2;
    case 'TENANT_NOTIFIED':
      return 3;
    case 'NEGOTIATION':
    case 'TENANT_ACCEPTED':
      return 4;
    case 'ACCOUNTING':
      return 5;
    case 'COMPLETED':
      return 6;
    default:
      return 1;
  }
}

export function leaseRenewalStages(review: RentReviewCase, decision?: RentReviewDecision) {
  const active = resolveLeaseRenewalStageIndex(review, decision);
  return LEASE_RENEWAL_STAGES.map((stage, index) => ({
    ...stage,
    status: index < active ? ('done' as const) : index === active ? ('current' as const) : ('upcoming' as const),
  }));
}

export function isRentReviewDecided(
  review: RentReviewCase,
  decision?: RentReviewDecision,
): boolean {
  if (decision != null) return true;
  if (review.workflowState) {
    return (
      review.workflowState === 'COMPLETED' ||
      review.workflowState === 'CANCELLED' ||
      review.workflowState === 'POSTPONED'
    );
  }
  const status = review.status.toLowerCase().trim();
  return status === 'completed' || status.includes('cancelled');
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
