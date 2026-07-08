import { RENT_REVIEW_WORKFLOW_STATE } from '@/constants/api-enums';
import type { RentReviewCase } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress } from './types';

const RENT_REVIEW_AGENT_STEPS = [
  { id: 'pending_confirmation', label: 'Pending confirmation' },
  { id: 'agent_review', label: 'Agent review' },
  { id: 'tenant_notified', label: 'Tenant notified' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'tenant_decision', label: 'Tenant decision' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'completed', label: 'Completed' },
] as const;

function resolveRentReviewStepId(workflowState?: string): string {
  switch (workflowState) {
    case RENT_REVIEW_WORKFLOW_STATE.PENDING_CONFIRMATION:
      return 'pending_confirmation';
    case RENT_REVIEW_WORKFLOW_STATE.AGENT_REVIEW:
      return 'agent_review';
    case RENT_REVIEW_WORKFLOW_STATE.TENANT_NOTIFIED:
      return 'tenant_notified';
    case RENT_REVIEW_WORKFLOW_STATE.NEGOTIATION:
      return 'negotiation';
    case RENT_REVIEW_WORKFLOW_STATE.TENANT_ACCEPTED:
    case RENT_REVIEW_WORKFLOW_STATE.TENANT_REJECTED:
      return 'tenant_decision';
    case RENT_REVIEW_WORKFLOW_STATE.ACCOUNTING:
      return 'accounting';
    case RENT_REVIEW_WORKFLOW_STATE.COMPLETED:
      return 'completed';
    case RENT_REVIEW_WORKFLOW_STATE.CANCELLED:
    case RENT_REVIEW_WORKFLOW_STATE.POSTPONED:
      return 'pending_confirmation';
    default:
      return 'pending_confirmation';
  }
}

export function rentReviewWorkflowProgress(review: RentReviewCase): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    'Rent review workflow',
    RENT_REVIEW_AGENT_STEPS,
    resolveRentReviewStepId(review.workflowState),
  );
}
