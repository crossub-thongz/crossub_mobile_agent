import { RENT_REVIEW_WORKFLOW_STATE } from '@/constants/api-enums';
import type { RentReviewCase } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress } from './types';

/** Five-stage rent review flow (manager Excel spec). */
const RENT_REVIEW_AGENT_STEPS = [
  { id: 'rent_research', label: 'Rent research' },
  { id: 'agent_confirmed', label: 'Agent confirmed' },
  { id: 'tenant_notified', label: 'Tenant notified' },
  { id: 'tenant_decision', label: 'Tenant decision' },
  { id: 'completed', label: 'Completed' },
] as const;

function resolveRentReviewStepId(workflowState?: string): string {
  const normalized = workflowState?.toUpperCase();
  switch (normalized) {
    case RENT_REVIEW_WORKFLOW_STATE.PENDING_CONFIRMATION:
      return 'rent_research';
    case RENT_REVIEW_WORKFLOW_STATE.AGENT_REVIEW:
    case RENT_REVIEW_WORKFLOW_STATE.NEGOTIATION:
      return 'agent_confirmed';
    case RENT_REVIEW_WORKFLOW_STATE.TENANT_NOTIFIED:
      return 'tenant_notified';
    case RENT_REVIEW_WORKFLOW_STATE.TENANT_ACCEPTED:
    case RENT_REVIEW_WORKFLOW_STATE.TENANT_REJECTED:
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

export function rentReviewWorkflowProgress(review: RentReviewCase): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    'Rent review workflow',
    RENT_REVIEW_AGENT_STEPS,
    resolveRentReviewStepId(review.workflowState),
  );
}
