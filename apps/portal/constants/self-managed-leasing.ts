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

  // Shared
  cancel: 'Cancel',
  sending: 'Sending…',
  saving: 'Saving…',
  uploading: 'Uploading…',
  cycleMissing: 'Leasing cycle not available — refresh and try again',
} as const;

/** Tenant-selection queue copy (all tiers). */
export const TENANT_SELECTION_COPY = {
  approved: (name: string) => `${name} approved`,
  declined: (reason: string) => `Declined: ${reason}`,
  decisionFailed: 'Could not record the decision',
} as const;
