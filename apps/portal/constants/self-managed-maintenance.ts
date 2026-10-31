/**
 * Self-Manage maintenance (Phase 1, Daniel 17 Oct 2026): the steps a CROSSUB Account Manager
 * runs on a job — urgent triage, issue triage, quotes, visit booking, invoice and completion —
 * run by the agent from the Maintenance page. Value sets are typed off the contract DTOs, so a
 * new server value fails the type-check here.
 */

import type { components } from '@crossub-thongz/api-contract';

import {
  MAINTENANCE_ISSUE_TYPE_OTHER,
  MAINTENANCE_ISSUE_TYPES,
  type MaintenanceIssueType,
} from '@/constants/maintenance-issue-types';

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

export type VisitTenantDecision = NonNullable<
  Schemas['AgentMaintenanceScheduleProposalDto']['tenantDecision']
>;

export const VISIT_TENANT_DECISION = {
  APPROVED: 'approved',
  DECLINED: 'declined',
} as const satisfies Record<string, VisitTenantDecision>;

/** Where the offered visit times stand, read off the job's schedule proposal. */
/** The machine-read anchor the server appends to a visit window, e.g. " (2026-11-03 10:00)". */
export const VISIT_ANCHOR_GLOBAL_PATTERN = /\s*\(\d{4}-\d{2}-\d{2} \d{2}:\d{2}\)/g;

export const VISIT_PROPOSAL_STATE = {
  NONE: 'none',
  AWAITING_TENANT: 'awaiting_tenant',
  TENANT_DECLINED: 'tenant_declined',
} as const;
export type VisitProposalState = (typeof VISIT_PROPOSAL_STATE)[keyof typeof VISIT_PROPOSAL_STATE];

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

export type MaintenanceIssueTrade = NonNullable<Schemas['UpdateMaintenanceIssueDto']['trade']>;

/** The trades a fault can be put under — the issue types, less the free-text "Others". */
export const MAINTENANCE_ISSUE_TRADE_OPTIONS = MAINTENANCE_ISSUE_TYPES.filter(
  (type): type is Exclude<MaintenanceIssueType, typeof MAINTENANCE_ISSUE_TYPE_OTHER> =>
    type !== MAINTENANCE_ISSUE_TYPE_OTHER,
) satisfies readonly MaintenanceIssueTrade[];

export type MaintenanceIssueUrgency = NonNullable<Schemas['UpdateMaintenanceIssueDto']['urgency']>;

export const MAINTENANCE_ISSUE_URGENCY = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  URGENT_CONFIRMED: 'urgent_confirmed',
  POSSIBLE_URGENT: 'possible_urgent',
  NON_URGENT: 'non_urgent',
  INSUFFICIENT_INFORMATION: 'insufficient_information',
} as const satisfies Record<string, MaintenanceIssueUrgency>;

/** Every urgency a fault may hold: the older normal/urgent pair and the AI's four values. */
export const MAINTENANCE_ISSUE_URGENCY_VALUES: readonly MaintenanceIssueUrgency[] =
  Object.values(MAINTENANCE_ISSUE_URGENCY);

/** The four the staff assessment offers when correcting a fault (the AI's own vocabulary). */
export const MAINTENANCE_ISSUE_URGENCY_EDIT_OPTIONS: readonly MaintenanceIssueUrgency[] = [
  MAINTENANCE_ISSUE_URGENCY.URGENT_CONFIRMED,
  MAINTENANCE_ISSUE_URGENCY.POSSIBLE_URGENT,
  MAINTENANCE_ISSUE_URGENCY.NON_URGENT,
  MAINTENANCE_ISSUE_URGENCY.INSUFFICIENT_INFORMATION,
];

export const MAINTENANCE_ISSUE_URGENCY_LABEL: Record<MaintenanceIssueUrgency, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
  urgent_confirmed: 'Urgent — confirmed',
  possible_urgent: 'Possibly urgent',
  non_urgent: 'Not urgent',
  insufficient_information: 'Needs more info',
};

export const MAINTENANCE_SPLIT_PRIORITY_OPTIONS: readonly {
  value: MaintenanceSplitPriority;
  label: string;
}[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High (urgent)' },
  { value: 'critical', label: 'Critical (urgent)' },
];

export type MaintenanceResponsibility = Schemas['AgentSelfManagedSetResponsibilityDto']['responsibility'];

/** Who can pay for a repair. The landlord is the owner in this app's words. */
export const MAINTENANCE_RESPONSIBILITY = {
  LANDLORD: 'landlord',
  TENANT: 'tenant',
  STRATA: 'strata',
} as const satisfies Record<string, MaintenanceResponsibility>;

export const MAINTENANCE_RESPONSIBILITY_OPTIONS: readonly MaintenanceResponsibility[] =
  Object.values(MAINTENANCE_RESPONSIBILITY);

export const MAINTENANCE_RESPONSIBILITY_LABEL: Record<MaintenanceResponsibility, string> = {
  landlord: 'Owner',
  tenant: 'Tenant',
  strata: 'Strata',
};

/** A fault's own responsibility, which can also be left unclear. */
export type MaintenanceIssueResponsibility = NonNullable<
  Schemas['UpdateMaintenanceIssueDto']['responsibility']
>;

export const MAINTENANCE_ISSUE_RESPONSIBILITY_LABEL: Record<MaintenanceIssueResponsibility, string> = {
  landlord: 'Owner',
  tenant: 'Tenant',
  strata: 'Strata',
  unclear: 'Unclear',
};

export const MAINTENANCE_ISSUE_RESPONSIBILITY_VALUES = Object.keys(
  MAINTENANCE_ISSUE_RESPONSIBILITY_LABEL,
) as MaintenanceIssueResponsibility[];

export type OwnerQuoteOutcome = Schemas['AgentSelfManagedOwnerQuoteReplyDto']['outcome'];

/** The owner's answer to a quote the agency emailed them, as the agency records it. */
export const OWNER_QUOTE_OUTCOME = {
  APPROVED: 'approved',
  DECLINED: 'declined',
} as const satisfies Record<string, OwnerQuoteOutcome>;

export type EscalationStatus = Schemas['AgentMaintenanceEscalationDto']['status'];
export type EscalationResolutionAction = Schemas['ResolveMaintenanceEscalationDto']['action'];
export type EscalationOverrideReason = NonNullable<
  Schemas['ResolveMaintenanceEscalationDto']['reasonCode']
>;

export const ESCALATION_STATUS = {
  OPEN: 'open',
  RESOLVED: 'resolved',
} as const satisfies Record<string, EscalationStatus>;

export type EscalationReason = Schemas['AgentMaintenanceEscalationDto']['reason'];

export const ESCALATION_REASON = {
  /** Cros named who pays; on Self-Manage it is a recommendation the agency confirms. */
  RESPONSIBILITY_RECOMMENDED: 'responsibility_recommended',
} as const satisfies Record<string, EscalationReason>;

/**
 * Escalations another step answers, so the escalation list leaves them out: Cros's recommended
 * party is confirmed or changed in Who pays, which resolves it on the server.
 */
export const ESCALATION_REASONS_HANDLED_IN_STEPS: readonly EscalationReason[] = [
  ESCALATION_REASON.RESPONSIBILITY_RECOMMENDED,
];

export const ESCALATION_RESOLUTION_ACTION = {
  OVERRIDE: 'override',
  PROCEED: 'proceed',
  DISMISS: 'dismiss',
} as const satisfies Record<string, EscalationResolutionAction>;

/** Why the agency decided by hand — the reason an override must carry. */
export const ESCALATION_OVERRIDE_REASON_OPTIONS: readonly {
  value: EscalationOverrideReason;
  label: string;
}[] = [
  { value: 'CLIENT_INSTRUCTION', label: 'Owner or tenant instruction' },
  { value: 'POLICY', label: 'Agency policy' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'AI_WRONG', label: 'The system got it wrong' },
  { value: 'DATA_CORRECTION', label: 'Correcting job details' },
  { value: 'DUPLICATE', label: 'Duplicate' },
  { value: 'OTHER', label: 'Other' },
];

export type MaintenanceEmailRecipientRole = Schemas['MaintenanceCaseEmailRecipientDto']['role'];

/**
 * Who the agency can email from a job. The owner (landlord) is emailed on their own, from the
 * agency's address rather than the job's.
 */
export const MAINTENANCE_EMAIL_RECIPIENT = {
  TENANT: 'tenant',
  CONTRACTOR: 'contractor',
  STRATA: 'strata',
  LANDLORD: 'landlord',
} as const satisfies Record<string, MaintenanceEmailRecipientRole>;

export type MaintenanceEmailRecipient =
  (typeof MAINTENANCE_EMAIL_RECIPIENT)[keyof typeof MAINTENANCE_EMAIL_RECIPIENT];

export const MAINTENANCE_EMAIL_RECIPIENT_LABEL: Record<MaintenanceEmailRecipient, string> = {
  tenant: 'Tenant',
  contractor: 'Tradie',
  strata: 'Strata',
  landlord: 'Owner',
};

/** A new email from the job is recorded as a reply on the job's thread (provenance only). */
export const MAINTENANCE_CASE_EMAIL_INTENT = {
  REPLY: 'reply',
} as const satisfies Record<string, Schemas['SendMaintenanceCaseEmailDto']['intent']>;

/** Server limits mirrored for the inputs (the DTOs enforce them too). */
export const SELF_MANAGED_MAINTENANCE_LIMITS = {
  dismissReasonMin: 3,
  splitDescriptionMin: 3,
  jobDescriptionMin: 5,
  jobDescriptionMax: 2000,
  issueDescriptionMax: 400,
  issueLocationMax: 200,
  extraQuestionsMax: 10,
  extraQuestionMax: 500,
  tenantNameMax: 160,
  tenantEmailMax: 160,
  tenantPhoneMax: 40,
  responsibilityReasonMax: 500,
  ownerMessageMax: 2000,
  ownerNoteMax: 600,
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
  askTenant: 'Ask the tenant',
  askTenantHint: 'Tick the questions to email. Untick any you already know the answer to.',
  askTenantNoSuggested: 'No unsent questions left. Type your own below.',
  extraQuestions: 'Your own questions (optional, one per line)',
  extraQuestionsLimit: (max: number, length: number) =>
    `Up to ${max} questions, ${length} characters each.`,
  questionsEmailed: 'Questions emailed to the tenant',
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

  crossubTitle: 'Let CROSSUB arrange this?',
  crossubHint: (name: string) =>
    `${name} arranges the quote. If you approve, you pay CROSSUB by card and CROSSUB pays the tradie. Your own tradies stay free.`,
  crossubFee: (fee: string | null) =>
    fee === null ? 'No CROSSUB fee on top of the quote.' : `CROSSUB fee ${fee} inc GST on top of the quote.`,
  crossubAsk: 'Get a Quote with Crossub',
  crossubAsked: (name: string) =>
    `${name} has been asked to quote. Their quote appears under Compare quotes.`,
  crossubRequested: 'Crossub Assistance quote requested',
  crossubBadge: 'CROSSUB',
  crossubPayApprove: (amount: string) => `Pay ${amount} & approve`,
  crossubOwnerPayApprove: (amount: string) => `Owner approved: pay ${amount} & approve`,
  crossubPayNote: (fee: string | null) =>
    fee === null
      ? 'Paid to CROSSUB by card. CROSSUB pays the tradie.'
      : `Includes CROSSUB fee ${fee}. Paid to CROSSUB by card; CROSSUB pays the tradie.`,
  crossubPaymentTitle: 'CROSSUB maintenance',
  crossubPaid: 'Paid. Approving the quote',
  crossubSupplierPaid: 'CROSSUB pays the tradie for this job. Nothing to record here.',

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
  compareHint:
    'Approve one to issue the work order, or email it to the owner first. Declining needs a reason.',
  sendToOwner: 'Send to owner',
  sendToOwnerTitle: 'Email this quote to the owner for approval',
  sendToOwnerHint: (email: string) =>
    `Goes to ${email} from your agency’s address, with the quote document if the tradie sent one. The owner replies to you; record their answer here.`,
  ownerEmailLabel: 'Owner email',
  ownerEmailMissing: 'No owner email on file. Add it to send the quote; it is saved on the property.',
  ownerMessage: 'Note to the owner (optional)',
  sendToOwnerConfirm: 'Email quote',
  sentToOwner: 'Quote emailed to the owner',
  ownerAwaiting: (when: string) => `Sent to the owner ${when}. Awaiting their reply.`,
  ownerResent: 'Send again',
  ownerApprovedAction: 'Owner approved: approve & issue work order',
  ownerDeclinedAction: 'Owner declined',
  ownerDeclineNote: 'What the owner said',
  ownerDeclineConfirm: 'Record decline',
  ownerApproved: 'Owner’s approval recorded. Work order issued',
  ownerDeclined: 'Owner’s decline recorded',
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
  visitAwaitingTenant: (when: string, times: string) =>
    `Sent to the tenant ${when}: ${times}. Waiting for them to pick a time.`,
  visitTenantDeclined: (times: string, reason: string | null) =>
    `The tenant can't do ${times}${reason ? ` (${reason})` : ''}. Send new times or record one arranged directly.`,
  sendNewVisitTimes: 'Send new times',
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

  escalationTitle: 'Needs your decision',
  escalationHint: 'The system stopped here and needs a person to decide.',
  escalationProceed: 'Carry on',
  escalationDismiss: 'Not an issue',
  escalationOverride: 'I decided myself',
  escalationReason: 'Reason',
  escalationNote: 'What you decided',
  escalationNoteRequired: 'Say what you decided.',
  escalationSave: 'Save decision',
  escalationCancel: 'Cancel',
  escalationResolved: 'Escalation resolved',
  escalationRaised: (at: string) => `Raised ${at}`,

  awaitingQuoteSelfManaged:
    'Awaiting the tradie’s quote. Nothing is chased automatically on your jobs; follow up with them yourself.',
  quoteListSelfManagedHint:
    'Expand a tradie to approve, negotiate or decline their quote. Nothing chases tradies on your jobs automatically, so follow up with them yourself.',
  advisoryHint:
    'Nothing on this job is decided or sent automatically. Cros recommends who pays and how to split the report; every step is yours.',

  responsibilityTitle: 'Who pays',
  responsibilityNone: 'Not decided yet.',
  responsibilityCurrent: (party: string) => `${party} pays for this repair.`,
  responsibilityRecommended: (party: string, confidence: number) =>
    `Cros recommends ${party} (${confidence}% confident).`,
  responsibilityConfirm: (party: string) => `Confirm ${party}`,
  responsibilityChange: 'Change',
  responsibilityChoose: 'Choose who pays',
  responsibilityParty: 'Who pays',
  responsibilityReason: 'Why (optional)',
  responsibilitySave: 'Save',
  responsibilityHint:
    'The tenant or strata gets the responsibility notice. Changing it after quotes are out sends the job back to review; it can’t change once a tradie is booked.',
  responsibilitySaved: 'Responsibility saved',

  workOrderTitle: 'Work order',
  workOrderIssued: (number: string, name: string | null) =>
    `${number} issued${name ? ` to ${name}` : ''}.`,
  workOrderAmount: (amount: string) => `Authorised up to ${amount}.`,
  workOrderStatus: 'Status',

  jobTitle: 'Job details',
  jobEdit: 'Edit job',
  jobDescription: 'Description',
  jobUrgent: 'Urgent',
  jobTenantTitle: 'Tenant on this job',
  jobTenantName: 'Tenant name',
  jobTenantEmail: 'Tenant email',
  jobTenantPhone: 'Tenant phone',
  jobTenantNone: 'No tenant on this job.',
  jobSave: 'Save job',
  jobSaved: 'Job updated',
  cancel: 'Cancel',

  issueEdit: 'Edit',
  issueDescription: 'Fault',
  issueLocation: 'Where (optional)',
  issueTrade: 'Trade',
  issueTradeNone: 'No trade set',
  issueUrgency: 'Urgency',
  issueUrgencyNone: 'Not set',
  issueResponsibility: 'Who pays',
  issueResponsibilityNone: 'Not set',
  issueSave: 'Save fault',
  issueAdd: 'Add a fault',
  issueAdded: 'Fault added',
  aiReview: 'Read the report again with AI',
  aiReviewConfirm:
    'Read the report again? The faults are picked out afresh; ones you edited are kept. If they need different trades, Cros suggests separate jobs for you to split.',
  aiReviewDone: 'Report read again',

  withdrawTradie: 'Withdraw',
  withdrawConfirm: (name: string) => `Stop asking ${name} to quote?`,
  tradieWithdrawn: 'Tradie withdrawn',
  copyQuoteLink: 'Copy quote link',
  quoteLinkCopied: 'Quote form link copied',
  quoteLinkReady: 'Quote form link',
  quoteLinkExpires: (when: string) => `Works until ${when}. A new link replaces this one.`,
  quoteLinkCopyFailed: "Couldn't copy. Select the link and copy it.",
  invitedTitle: 'Asked to quote',

  disputedTitle: 'Invoice disputed',
  disputedHint: (invoice: string) =>
    `You disputed the ${invoice} invoice. Withdraw the dispute to accept it or dispute it again.`,
  withdrawDispute: 'Withdraw dispute',
  disputeWithdrawn: 'Dispute withdrawn',

  emailOwnerNote: 'Goes to the owner on its own, from your agency’s address.',
  emailRecipient: 'To',
  emailSubject: 'Subject',
  emailBody: 'Message',
  emailSend: 'Send email',
  emailSent: 'Email sent',
  emailNoRecipient: 'No email address on this job yet.',
  emailServiced: 'CROSSUB sends the emails on this job. They show here once sent.',
  appUpdatesNote: 'Updates the tenant gets in their app.',
} as const;
