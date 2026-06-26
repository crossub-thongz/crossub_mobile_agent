import type { RentReviewCase } from '@/lib/types';

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
