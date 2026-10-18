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

/**
 * Self-Manage agency-conducted jobs: the agency principal signs the report off, not CROSSUB, so
 * the full detail page speaks to the agent instead of saying CROSSUB is reviewing it.
 */
export const AGENT_AWAITING_AGENCY_SIGN_OFF_LABEL = 'Waiting for your sign-off';

export const AGENCY_FIELD_REPORT_REVIEW_COPY = {
  title: (kind: string) => `${kind} report review`,
  pending: 'Your inspector has finished. Review the report and sign it off, or send it back.',
  rejected: 'You sent this report back. The inspector must correct it and resubmit.',
  approved: 'You signed off this report. You can view or download it.',
  notSubmitted: 'Your agency inspector conducts this inspection.',
} as const;
