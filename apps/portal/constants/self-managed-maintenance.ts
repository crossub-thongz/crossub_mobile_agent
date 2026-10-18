/**
 * Self-Manage maintenance (Phase 1, Daniel 17 Oct 2026): the steps a CROSSUB Account Manager
 * runs on a job — urgent triage, issue triage, quotes, visit booking, invoice and completion —
 * run by the agent from the Maintenance page. Value sets are typed off the contract DTOs, so a
 * new server value fails the type-check here.
 */

import type { components } from '@crossub-thongz/api-contract';

type Schemas = components['schemas'];

export type UrgentDecision = Schemas['AuthoriseUrgentWorkDto']['decision'];
export type InvoiceResolution = Schemas['ResolveMaintenanceInvoiceMatchDto']['resolution'];
export type InvoiceMatchStatus = Schemas['AgentMaintenanceInvoiceMatchDto']['status'];
export type MaintenanceIssueStatus = Schemas['AgentMaintenanceIssueDto']['status'];
export type MaintenanceSplitPriority = NonNullable<Schemas['SplitMaintenanceFlowDto']['priority']>;
export type SelfManagedUploadKind = Schemas['AgentSelfManagedUploadDto']['kind'];

export const SELF_MANAGED_UPLOAD_KIND = {
  EVIDENCE: 'evidence',
  INVOICE: 'invoice',
} as const satisfies Record<string, SelfManagedUploadKind>;

export type UrgentAuthorisationStatus = Schemas['AgentMaintenanceUrgentAuthorisationDto']['status'];
export type MaintenanceQuoteStatus = Schemas['AgentMaintenanceQuoteDto']['status'];

export const MAINTENANCE_QUOTE_STATUS = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  DECLINED: 'declined',
} as const satisfies Record<string, MaintenanceQuoteStatus>;

export const URGENT_DECISION = {
  CONFIRM_URGENT: 'CONFIRM_URGENT',
  EMERGENCY_MAKE_SAFE: 'EMERGENCY_MAKE_SAFE',
  CONVERT_TO_NORMAL: 'CONVERT_TO_NORMAL',
  ESCALATE_EXTERNAL: 'ESCALATE_EXTERNAL',
  CLOSE_NO_ACTION: 'CLOSE_NO_ACTION',
} as const satisfies Record<string, UrgentDecision>;

/** A work decision sends a contractor out under a spending limit; the rest need a reason. */
export const URGENT_WORK_DECISIONS: readonly UrgentDecision[] = [
  URGENT_DECISION.CONFIRM_URGENT,
  URGENT_DECISION.EMERGENCY_MAKE_SAFE,
];

export const URGENT_DECISION_OPTIONS: readonly { value: UrgentDecision; label: string }[] = [
  { value: URGENT_DECISION.CONFIRM_URGENT, label: 'Confirm urgent and send a tradie' },
  { value: URGENT_DECISION.EMERGENCY_MAKE_SAFE, label: 'Make safe only' },
  { value: URGENT_DECISION.CONVERT_TO_NORMAL, label: 'Not urgent: handle as a normal job' },
  { value: URGENT_DECISION.ESCALATE_EXTERNAL, label: 'Escalate to emergency services or utility' },
  { value: URGENT_DECISION.CLOSE_NO_ACTION, label: 'Close, no action needed' },
];

export const URGENT_AUTHORISATION_STATUS = {
  ACTIVE: 'ACTIVE',
} as const satisfies Record<string, UrgentAuthorisationStatus>;

export const INVOICE_RESOLUTION = {
  APPROVE_VARIANCE: 'approve_variance',
  DISPUTE: 'dispute',
} as const satisfies Record<string, InvoiceResolution>;

export const INVOICE_MATCH_STATUS = {
  MATCHED: 'MATCHED',
  VARIANCE: 'VARIANCE',
  UNMATCHED: 'UNMATCHED',
  APPROVED: 'APPROVED',
  DISPUTED: 'DISPUTED',
} as const satisfies Record<string, InvoiceMatchStatus>;

/** An invoice the agent must accept or dispute before it can be paid. */
export const INVOICE_MATCH_NEEDS_DECISION: readonly InvoiceMatchStatus[] = [
  INVOICE_MATCH_STATUS.VARIANCE,
  INVOICE_MATCH_STATUS.UNMATCHED,
];

/** An invoice that is cleared for payment. */
export const INVOICE_MATCH_PAYABLE: readonly InvoiceMatchStatus[] = [
  INVOICE_MATCH_STATUS.MATCHED,
  INVOICE_MATCH_STATUS.APPROVED,
];

export const MAINTENANCE_ISSUE_STATUS = {
  PROPOSED: 'PROPOSED',
  CONFIRMED: 'CONFIRMED',
  MERGED: 'MERGED',
  DISMISSED: 'DISMISSED',
} as const satisfies Record<string, MaintenanceIssueStatus>;

/** Issues still in play — dismissed and merged ones drop out of triage. */
export const MAINTENANCE_ISSUE_LIVE: readonly MaintenanceIssueStatus[] = [
  MAINTENANCE_ISSUE_STATUS.PROPOSED,
  MAINTENANCE_ISSUE_STATUS.CONFIRMED,
];

export const MAINTENANCE_SPLIT_PRIORITY_OPTIONS: readonly {
  value: MaintenanceSplitPriority;
  label: string;
}[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High (urgent)' },
  { value: 'critical', label: 'Critical (urgent)' },
];

/** Server limits mirrored for the inputs (the DTOs enforce them too). */
export const SELF_MANAGED_MAINTENANCE_LIMITS = {
  dismissReasonMin: 3,
  splitDescriptionMin: 3,
} as const;

export const SELF_MANAGED_MAINTENANCE_COPY = {
  sectionTitle: 'Run this job',
  loading: 'Loading job…',
  loadFailed: "Couldn't load this job.",
  retry: 'Try again',
  saved: 'Saved',
  ownerCopyLimit: (limit: string) =>
    `The owner gets an emailed copy of quote decisions above ${limit}, and of the sign-off.`,
  ownerCopyNoLimit:
    'No repair limit is set, so the owner gets an emailed copy of every quote decision and of the sign-off.',

  urgentTitle: 'Urgent job',
  urgentHint: 'Decide what happens next. A tradie only goes out with a spending limit.',
  urgentDecided: 'Urgent decision recorded',
  decision: 'Decision',
  tradie: 'Tradie',
  chooseTradie: 'Choose a tradie',
  noPreferredTradies: 'Add preferred tradies in Settings to send one out.',
  scope: 'Work authorised',
  spendingLimit: 'Spending limit (AUD)',
  reason: 'Reason',
  recordDecision: 'Record decision',

  issuesTitle: 'Reported issues',
  noIssues: 'No separate issues were picked out of the report.',
  dismiss: 'Dismiss',
  dismissPrompt: 'Why dismiss it? e.g. not a fault, or split into its own job',
  dismissConfirm: 'Dismiss issue',
  answerPlaceholder: 'Tenant’s answer',
  saveAnswers: 'Save answers',
  sendQuestions: 'Email questions to tenant',
  questionsSent: (when: string) => `Questions sent ${when}`,
  answered: 'Answered',

  splitTitle: 'Split off a separate fault',
  splitHint: 'Creates a new job for a fault that needs a different trade or visit.',
  splitDescription: 'What is the separate fault?',
  priority: 'Priority',
  split: 'Create separate job',
  splitDone: 'Separate job created',

  combineTitle: 'Combine with another job',
  combineHint: 'Closes this job as a duplicate and adds its details to the job you pick.',
  combineNone: 'No other open jobs at this property.',
  combineInto: 'Combine into',
  combineNote: 'Why are these one job? (optional)',
  combineAcknowledge: 'I understand the commitments on these jobs will change.',
  combine: 'Combine jobs',
  combineDone: 'Jobs combined',
  alreadyQuoted: 'already out for quotes',

  inviteTitle: 'Ask tradies to quote',
  inviteHint: 'Each tradie you tick gets the quote request by email.',
  invited: 'Already invited',
  invite: 'Send quote request',
  invitesSent: 'Quote requests sent',
  addTradie: 'Add a tradie',
  tradieName: 'Business or tradie name',
  tradieEmail: 'Email',
  tradiePhone: 'Phone (optional)',
  saveTradie: 'Save tradie',
  tradieSaved: 'Tradie added to your preferred list',

  quoteTitle: 'Enter a quote for a tradie',
  quoteHint: 'For a quote a tradie phoned or emailed in.',
  noInvitedTradies: 'Ask a tradie to quote first.',
  price: 'Quote total incl. GST (AUD)',
  quoteScope: 'Work quoted',
  availability: 'When they can attend (optional)',
  comments: 'Notes (optional)',
  saveQuote: 'Save quote',
  quoteSaved: 'Quote saved',

  compareTitle: 'Compare quotes',
  compareHint: 'Approve one to issue the work order. Declining needs a reason.',
  lowest: 'Lowest',
  ownerCopied: 'Owner copied',
  approve: 'Approve',
  decline: 'Decline',
  declineReason: 'Why are you declining this quote?',
  declineConfirm: 'Decline quote',
  quoteApproved: 'Quote approved',
  quoteDeclined: 'Quote declined',
  noQuoteTotal: 'No total',

  scheduleTitle: 'Book the visit',
  visitTimesLabel: 'Times the tradie offered',
  visitTimesPlaceholder: 'e.g. Tue 21 Oct 9–11am or Wed 22 Oct 1–3pm',
  sendVisitTimes: 'Send times to tenant',
  visitTimesSent: 'Times sent to the tenant to confirm',
  arrangedLabel: 'Or record a visit they arranged directly',
  arrangedNote: 'How it was arranged (optional)',
  recordVisit: 'Record visit',
  visitRecorded: 'Visit recorded',

  invoiceTitle: 'Invoice',
  invoiceVariance: (invoice: string, approved: string) =>
    `Invoice ${invoice} differs from the approved ${approved}.`,
  invoiceUnmatched: (invoice: string) => `Invoice ${invoice} has no approved quote to match.`,
  invoiceNote: 'Note (optional)',
  acceptVariance: 'Accept invoice',
  dispute: 'Dispute',
  invoiceResolved: 'Invoice updated',
  paymentTitle: 'Record your payment to the tradie',
  paidAmount: 'Amount paid (AUD)',
  paymentReference: 'Payment reference (optional)',
  recordPayment: 'Mark paid',
  paymentRecorded: 'Payment recorded',

  completionTitle: 'Finish the job',
  completionHint: 'The job closes once all four are done.',
  gateEvidence: 'Completion photos',
  gateInvoice: 'Tradie’s invoice',
  gateTenant: 'Tenant confirmed it’s fixed',
  gateAgency: 'You signed the work off',
  uploadPhotos: 'Upload photos',
  uploadInvoice: 'Upload invoice',
  uploaded: 'Uploaded',
  tenantConfirmed: 'Tenant confirmed',
  recordTenant: 'Record tenant sign-off',
  tenantRecorded: 'Tenant sign-off recorded',
  signOff: 'Sign off work',
  signedOff: 'Work signed off',
  signOffNeedsEvidence: 'Upload the completion photos first.',
  done: 'Done',
} as const;
