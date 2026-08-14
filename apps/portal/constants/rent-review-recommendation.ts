import type { RentReviewWorkflowState } from '@/lib/rent-review/types';

/**
 * The agent's own recommended rent — the figure that replaces the researched one.
 *
 * Daniel Zhou, 14 Aug 2026 (CRS-0067 follow-up): *"Agent unable to adjust the rent increase
 * recomandation … Should be able to edit and save."* Until this, the research result was a
 * read-only card with one button on it, and the only number an agent could put in front of an
 * owner was the blended median of three platforms that have never seen the property.
 */

/** Audit kind the API writes on both an adjustment and a reset (`detail` carries from/to). */
export const RENT_REVIEW_RECOMMENDATION_AUDIT_KIND = 'recommendation_adjusted';

/** Audit kind for the landlord research pack — what a later adjustment leaves out of date. */
export const RENT_REVIEW_LANDLORD_PACK_AUDIT_KIND = 'landlord_research_email';

/**
 * States in which the recommendation may still be adjusted — mirrors
 * `RENT_REVIEW_RECOMMENDATION_EDITABLE_STATES` in the API.
 *
 * Past agent review the tenant holds a statutory notice quoting the rate, and the API refuses
 * with a 409. Hiding the control here is what keeps that refusal from being the way an agent
 * finds out.
 */
export const RENT_REVIEW_RECOMMENDATION_EDITABLE_STATES: readonly RentReviewWorkflowState[] = [
  'pending_confirmation',
  'agent_review',
];
