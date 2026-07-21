import { RENT_REVIEW_WORKFLOW_STATE } from '@/constants/api-enums';
import type { RentReviewCase } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress } from './types';

/** Six-stage rent review flow (manager Excel spec). */
const RENT_REVIEW_AGENT_STEPS = [
  { id: 'rent_research', label: 'Rent research' },
  { id: 'agent_confirmed', label: 'Agent decision' },
  { id: 'tenant_notified', label: 'Tenant notified' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'tenant_decision', label: 'Tenant decision' },
  { id: 'completed', label: 'Completed' },
] as const;

function resolveRentReviewStepId(workflowState?: string): string {
  const normalized = workflowState?.toUpperCase();
  switch (normalized) {
    case RENT_REVIEW_WORKFLOW_STATE.PENDING_CONFIRMATION:
      return 'rent_research';
    case RENT_REVIEW_WORKFLOW_STATE.AGENT_REVIEW:
      return 'agent_confirmed';
    case RENT_REVIEW_WORKFLOW_STATE.NEGOTIATION:
      return 'negotiation';
    case RENT_REVIEW_WORKFLOW_STATE.TENANT_NOTIFIED:
      return 'negotiation';
    case RENT_REVIEW_WORKFLOW_STATE.TENANT_REJECTED:
      return 'completed';
    case RENT_REVIEW_WORKFLOW_STATE.TENANT_ACCEPTED:
    case RENT_REVIEW_WORKFLOW_STATE.ACCOUNTING:
      return 'tenant_decision';
    case RENT_REVIEW_WORKFLOW_STATE.COMPLETED:
      return 'completed';
    case RENT_REVIEW_WORKFLOW_STATE.CANCELLED:
    case RENT_REVIEW_WORKFLOW_STATE.POSTPONED:
      return 'rent_research';
    default:
      return 'rent_research';
  }
}

function resolveRentReviewStepLabel(review: RentReviewCase, currentStepId: string): string {
  const state = review.workflowState?.toUpperCase();
  if (
    state === RENT_REVIEW_WORKFLOW_STATE.TENANT_NOTIFIED ||
    (state === RENT_REVIEW_WORKFLOW_STATE.NEGOTIATION && review.tenantResponse === 'pending')
  ) {
    return 'Pending negotiation';
  }
  if (state === RENT_REVIEW_WORKFLOW_STATE.NEGOTIATION && review.tenantResponse === 'counter') {
    return 'Counter-offer review';
  }
  return RENT_REVIEW_AGENT_STEPS.find((s) => s.id === currentStepId)?.label ?? 'Rent research';
}

export function rentReviewWorkflowProgress(review: RentReviewCase): CaseWorkflowProgress {
  const currentStepId = resolveRentReviewStepId(review.workflowState);
  const progress = buildCaseWorkflowProgress(
    'Rent review workflow',
    RENT_REVIEW_AGENT_STEPS,
    currentStepId,
  );
  return {
    ...progress,
    currentStepLabel: resolveRentReviewStepLabel(review, currentStepId),
  };
}
