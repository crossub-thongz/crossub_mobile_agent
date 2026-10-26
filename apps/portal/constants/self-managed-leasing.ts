/**
 * Self-Manage leasing (Phase 2): the letting steps a CROSSUB Account Manager runs on the other
 * plans — request info, negotiate terms, draft and send the agreement, the bond link, the open
 * report and the ingoing order — run by the agent. Value sets are typed off the contract DTOs,
 * so a new server value fails the type-check here.
 */

import type { components } from '@crossub-thongz/api-contract';

type Schemas = components['schemas'];

export type ApplicantDecisionValue = Schemas['SetApplicantDecisionDto']['decision'];
export type NegotiationParty = Schemas['AddNegotiationRoundDto']['proposedBy'];
export type NegotiationAnswer = Schemas['RespondToNegotiationRoundDto']['response'];
export type RentReviewTenantDecision = Schemas['TenantResponseDto']['decision'];

/** Approve / decline on the tenant-selection queue (`POST …/applications/{id}/decision`). */
export const APPLICANT_DECISION = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const satisfies Record<string, ApplicantDecisionValue>;

export const NEGOTIATION_PARTY = {
  APPLICANT: 'applicant',
  AGENT: 'agent',
  OFFICER: 'officer',
} as const satisfies Record<string, NegotiationParty>;

/** The two answers a live round takes; countering is a new round. */
export const NEGOTIATION_ANSWER = {
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
} as const satisfies Record<string, NegotiationAnswer>;

export const RENT_REVIEW_TENANT_DECISION = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  COUNTER: 'counter',
  DECLINE: 'decline',
} as const satisfies Record<string, RentReviewTenantDecision>;

/** Lease agreement e-sign status on the cycle view (`onboarding.agreement.signingStatus`). */
export const AGREEMENT_SIGNING_STATUS = {
  NOT_SENT: 'not_sent',
  SENT: 'sent',
  VIEWED: 'viewed',
  SIGNED: 'signed',
} as const;

/** File types the agreement uploads accept. */
export const AGREEMENT_UPLOAD_ACCEPT = 'application/pdf,image/*,.doc,.docx';

export const NEGOTIATION_PARTY_LABEL: Record<string, string> = {
  [NEGOTIATION_PARTY.APPLICANT]: 'Applicant',
  [NEGOTIATION_PARTY.AGENT]: 'You',
  [NEGOTIATION_PARTY.OFFICER]: 'CROSSUB',
};

export const SELF_MANAGED_LEASING_COPY = {
  // Applicant card
  requestInfo: 'Request info',
  requestInfoItems: 'What to ask for (one per line)',
  requestInfoItemsPlaceholder: 'Photo ID\nTwo recent payslips',
  requestInfoMessage: 'Message (optional)',
  requestInfoSend: 'Email applicant',
  requestInfoEmpty: 'Add an item or a message to send.',
  requestInfoSent: (name: string) => `Asked ${name} for more information`,

  proposeTerms: 'Propose terms',
  counter: 'Counter',
  weeklyRent: 'Weekly rent ($)',
  bond: 'Bond ($)',
  leaseTerm: 'Lease term',
  leaseTermPlaceholder: '52 weeks',
  startDate: 'Start date',
  note: 'Note (optional)',
  proposeSend: 'Send proposal',
  proposeEmpty: 'Set a rent, a term or a start date.',
  proposeSent: 'Terms proposed',

  liveRoundTitle: (roundNo: number, by: string) => `Round ${roundNo} · proposed by ${by}`,
  acceptedRound: (roundNo: number) => `Agreed in round ${roundNo}`,
  accept: 'Accept',
  decline: 'Decline',
  roundAccepted: 'Terms accepted',
  roundDeclined: 'Terms declined',

  // Agreement
  agreementTitle: 'Your agreement',
  agreementHint:
    'Edit the draft, confirm it and send it to the tenant, or upload your own agreement.',
  editBasics: 'Edit terms',
  saveBasics: 'Save terms',
  basicsSaved: 'Agreement terms saved',
  basicsEmpty: 'Change at least one term.',
  conditionLabel: 'Special condition',
  conditionPlaceholder: 'No smoking inside the property',
  addCondition: 'Add condition',
  conditionAdded: 'Condition added',
  conditionsHeading: 'Special conditions',
  noConditions: 'No special conditions yet.',
  confirm: 'Confirm draft',
  confirmed: 'Draft confirmed',
  regenerate: 'Regenerate and resend',
  regenerated: 'Agreement regenerated and sent to the tenant',
  sendToTenant: 'Send to tenant',
  sentToTenant: 'Agreement sent to the tenant',
  uploadOwn: 'Upload own agreement',
  uploadOwnSendToTenant: 'Send it to the tenant now',
  uploadedOwn: 'Agreement uploaded',
  uploadSigned: 'Upload signed copy',
  uploadedSigned: 'Signed copy uploaded',
  chooseFile: 'Choose file',

  // Bond
  bondLinkLabel: 'Bond lodgement link',
  bondLinkPlaceholder: 'https://',
  bondLinkSend: 'Save and email tenant',
  bondLinkResend: 'Update and resend',
  bondLinkSent: 'Bond link emailed to the tenant',
  bondLinkEmpty: 'Paste the bond lodgement link.',
  bondDescription: 'Paste the bond lodgement link. Saving emails it to the tenant.',
  agreementDescription: 'You draft, send and record the agreement on this plan.',

  // Open report / ingoing
  ingoingOrdered: 'Ingoing inspection ordered — opening job case',

  // Results (no reference check notice on Self-Manage)
  resultsClosed: 'This leasing case is closed.',
  resultsEmptyDescription: 'Applicants appear here once they are added in the Application step.',

  // Shared
  cancel: 'Cancel',
  sending: 'Sending…',
  saving: 'Saving…',
  uploading: 'Uploading…',
  cycleMissing: 'Leasing cycle not available — refresh and try again',
} as const;

// ---- Screening (Self-Manage): Cros score and the reference check on an applicant ----

export type ReferenceRecommendation = NonNullable<
  Schemas['SetApplicantFeedbackDto']['recommendation']
>;
export type ReferenceCheckStatus = Schemas['AgentReferenceCheckDto']['status'];
export type ReferenceSupport = Schemas['AgentReferenceCheckSummaryDto']['supportsRecommendation'];

export const REFERENCE_RECOMMENDATION = {
  RECOMMEND: 'recommend',
  REJECT: 'reject',
} as const satisfies Record<string, ReferenceRecommendation>;

export const REFERENCE_RECOMMENDATION_LABEL: Record<ReferenceRecommendation, string> = {
  [REFERENCE_RECOMMENDATION.RECOMMEND]: 'Recommend',
  [REFERENCE_RECOMMENDATION.REJECT]: 'Do not recommend',
};

export const REFERENCE_CHECK_STATUS = {
  RECORDED: 'RECORDED',
  NOT_STARTED: 'NOT_STARTED',
  NO_REFEREES: 'NO_REFEREES',
  UNVERIFIED: 'UNVERIFIED',
} as const satisfies Record<string, ReferenceCheckStatus>;

export const REFERENCE_CHECK_STATUS_LABEL: Record<ReferenceCheckStatus, string> = {
  [REFERENCE_CHECK_STATUS.RECORDED]: 'Checked',
  [REFERENCE_CHECK_STATUS.NOT_STARTED]: 'Not started',
  [REFERENCE_CHECK_STATUS.NO_REFEREES]: 'No referees',
  [REFERENCE_CHECK_STATUS.UNVERIFIED]: 'No application form',
};

export const REFERENCE_SUPPORT = {
  YES: 'yes',
  NO: 'no',
  UNCLEAR: 'unclear',
} as const satisfies Record<string, ReferenceSupport>;

export const REFERENCE_SUPPORT_LABEL: Record<ReferenceSupport, string> = {
  [REFERENCE_SUPPORT.YES]: 'Notes support your recommendation',
  [REFERENCE_SUPPORT.NO]: 'Notes do not support your recommendation',
  [REFERENCE_SUPPORT.UNCLEAR]: 'Notes are unclear on your recommendation',
};

/** Cros applicant score levels, as the cycle view sends them (`aiScoreLevel`). */
export const CROS_SCORE_LEVEL_LABEL = {
  strong: 'Strong',
  medium: 'Medium',
  risk: 'Risk',
} as const;

export const SELF_MANAGED_SCREENING_COPY = {
  title: 'Screening',
  crosScore: 'Cros score',
  noScore: 'Not scored yet',
  show: 'Reference check',
  hide: 'Hide reference check',
  loading: 'Loading reference check…',
  referees: 'Referees',
  noPhone: 'No phone number',
  notes: 'Your notes from the calls',
  notesPlaceholder: 'What each referee said: rent paid on time, condition, would rent again.',
  recommendation: 'Your recommendation',
  save: 'Save check',
  saved: 'Reference check saved',
  saveEmpty: 'Add notes or choose a recommendation.',
  summarise: 'Summarise with Cros',
  summarising: 'Summarising…',
  summaryTitle: 'Cros summary',
  concerns: 'Concerns',
  feedbackSent: 'Result already emailed to the applicant. The check can no longer change.',
  skipTitle: 'Already have a tenant?',
  skipHint: 'Skip screening and go straight to onboarding. You cannot undo this.',
  skip: 'Skip screening',
  skipped: 'Screening skipped. Onboarding is next.',
} as const;

// ---- Money (Self-Manage): holding deposit and bond ----

export const ONBOARDING_MONEY_ITEM = {
  DEPOSIT: 'deposit',
  BOND: 'bond',
} as const;

export type OnboardingMoneyItem = (typeof ONBOARDING_MONEY_ITEM)[keyof typeof ONBOARDING_MONEY_ITEM];

export const SELF_MANAGED_MONEY_COPY = {
  [ONBOARDING_MONEY_ITEM.DEPOSIT]: {
    markPaid: 'Mark deposit received',
    markedPaid: 'Deposit marked received',
    markPaidHint: 'Received it outside the app? Mark it here. It posts to the property ledger.',
    approve: 'Approve deposit',
    approved: 'Deposit proof approved',
    rejected: 'Deposit proof rejected. The tenant can upload it again.',
  },
  [ONBOARDING_MONEY_ITEM.BOND]: {
    markPaid: 'Mark bond received',
    markedPaid: 'Bond marked received',
    markPaidHint: 'Bond lodged and paid? Mark it here. It posts to the property ledger.',
    approve: 'Approve bond',
    approved: 'Bond proof approved',
    rejected: 'Bond proof rejected. The tenant can upload it again.',
  },
  reject: 'Reject',
  rejectReason: 'Reason for the tenant (optional)',
  rejectReasonPlaceholder: 'The receipt is unreadable',
  confirmReject: 'Reject proof',
  principalOrAccountantOnly: 'Only the agency principal or accountant can record this as received.',
} as const;

/** Tenant-selection queue copy (all tiers). */
export const TENANT_SELECTION_COPY = {
  approved: (name: string) => `${name} approved`,
  declined: (reason: string) => `Declined: ${reason}`,
  decisionFailed: 'Could not record the decision',
} as const;
