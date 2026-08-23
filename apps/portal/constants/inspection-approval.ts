/**
 * Officer sign-off on a finished inspection job.
 *
 * Completion is the inspector's claim that they attended. Approval is CROSSUB's
 * that the work is acceptable. Agent-facing copy is "Pending Approval"
 * until `approvedAt` exists.
 *
 * Keep the cutoff in lock-step with `crossub_web` `INSPECTION_APPROVAL_GO_LIVE`.
 */
export const INSPECTION_APPROVAL_GO_LIVE = '2026-08-13T14:00:00.000Z';

export const AGENT_AWAITING_CROSSUB_APPROVAL_LABEL = 'Pending Approval';
