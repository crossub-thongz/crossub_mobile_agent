/**
 * Self-Manage Tenancy Review (Daniel, Oct 2026): rent reviews and lease renewals the agency runs
 * itself, every step CROSSUB runs from the admin portal on the other plans. Value sets are typed
 * off the contract DTOs, so a new server value fails the type-check here.
 */

import type { components } from '@crossub-thongz/api-contract';

import type { ServerRentReviewWorkflowState } from '@/lib/rent-review-workflow-types';

type Schemas = components['schemas'];

export type TenancyReviewKind = Schemas['SetTenancyReviewKindDto']['kind'];
export type LeaseRenewalArrangement = Schemas['CompleteLeaseRenewalDto']['leaseArrangement'];
export type TenancyReviewCloseOutcome = Schemas['ForceCloseRentReviewDto']['outcome'];

export const TENANCY_REVIEW_KIND = {
  RENT_REVIEW: 'rent_review',
  LEASE_RENEWAL: 'lease_renewal',
} as const satisfies Record<string, TenancyReviewKind>;

export const LEASE_RENEWAL_ARRANGEMENT = {
  FIXED: 'fixed',
  PERIODIC: 'periodic',
} as const satisfies Record<string, LeaseRenewalArrangement>;

export const TENANCY_REVIEW_CLOSE_OUTCOME = {
  RENT_INCREASED: 'RENT_INCREASED',
  RENT_UNCHANGED: 'RENT_UNCHANGED',
  TENANT_VACATE: 'TENANT_VACATE',
} as const satisfies Record<string, TenancyReviewCloseOutcome>;

/** The review's workflow position as the read path sends it (lowercase). */
export const TENANCY_REVIEW_STATE = {
  PENDING_CONFIRMATION: 'pending_confirmation',
  AGENT_REVIEW: 'agent_review',
  TENANT_NOTIFIED: 'tenant_notified',
  NEGOTIATION: 'negotiation',
  TENANT_ACCEPTED: 'tenant_accepted',
  TENANT_REJECTED: 'tenant_rejected',
  ACCOUNTING: 'accounting',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  POSTPONED: 'postponed',
} as const satisfies Record<string, ServerRentReviewWorkflowState>;

const S = TENANCY_REVIEW_STATE;

/** Before the tenant has a notice: the pathway can still change. */
export const TENANCY_REVIEW_PATHWAY_STATES: readonly ServerRentReviewWorkflowState[] = [
  S.PENDING_CONFIRMATION,
  S.AGENT_REVIEW,
];

/** The market research runs (or reruns) while the agency is still deciding the rent. */
export const TENANCY_REVIEW_RESEARCH_STATES: readonly ServerRentReviewWorkflowState[] = [
  S.PENDING_CONFIRMATION,
  S.AGENT_REVIEW,
];

export const TENANCY_REVIEW_POSTPONE_STATES: readonly ServerRentReviewWorkflowState[] = [
  S.PENDING_CONFIRMATION,
  S.AGENT_REVIEW,
  S.TENANT_NOTIFIED,
  S.NEGOTIATION,
];

/** Any open stage can be closed with a recorded outcome. */
export const TENANCY_REVIEW_CLOSE_STATES: readonly ServerRentReviewWorkflowState[] = [
  S.PENDING_CONFIRMATION,
  S.AGENT_REVIEW,
  S.TENANT_NOTIFIED,
  S.NEGOTIATION,
  S.TENANT_ACCEPTED,
  S.TENANT_REJECTED,
  S.ACCOUNTING,
  S.POSTPONED,
];

/** The notice of rent increase is drafted before it goes and can be replaced while it stands. */
export const TENANCY_REVIEW_NOTICE_UPLOAD_STATES: readonly ServerRentReviewWorkflowState[] = [
  S.AGENT_REVIEW,
  S.TENANT_NOTIFIED,
  S.NEGOTIATION,
];

export const TENANCY_REVIEW_COPY = {
  title: 'Run this review',
  hint: 'You run every step on this plan. Cros researches the market and advises; you decide.',
  noProperty: 'This review is not linked to a property.',
  busy: 'Working…',
  cancel: 'Cancel',

  // Pathway
  pathwayTitle: 'Pathway',
  pathwayHint: 'Choose before the tenant gets a notice.',
  pathwayLabel: {
    [TENANCY_REVIEW_KIND.RENT_REVIEW]: 'Rent review',
    [TENANCY_REVIEW_KIND.LEASE_RENEWAL]: 'Lease renewal',
  } satisfies Record<TenancyReviewKind, string>,
  pathwayChosen: {
    [TENANCY_REVIEW_KIND.RENT_REVIEW]: 'Rent review chosen. Market research is running.',
    [TENANCY_REVIEW_KIND.LEASE_RENEWAL]: 'Lease renewal chosen. Complete the renewal form.',
  } satisfies Record<TenancyReviewKind, string>,

  // Lease renewal
  renewalTitle: 'Lease renewal',
  renewalHint: 'Record the new lease. The review completes and the owner gets a copy.',
  arrangement: 'Lease',
  arrangementLabel: {
    [LEASE_RENEWAL_ARRANGEMENT.FIXED]: 'Fixed term',
    [LEASE_RENEWAL_ARRANGEMENT.PERIODIC]: 'Periodic',
  } satisfies Record<LeaseRenewalArrangement, string>,
  newLeaseStart: 'New lease starts',
  newLeaseEnd: 'New lease ends',
  newWeeklyRent: 'Weekly rent ($), blank keeps the current rent',
  rentIncreaseOn: 'Rent increase on (optional)',
  completeRenewal: 'Complete renewal',
  renewalCompleted: 'Lease renewal completed',

  // Research
  researchTitle: 'Market research',
  researchHint: 'Cros checks comparable rents and recommends one. Rerun it any time before the notice.',
  runResearch: 'Run market research',
  rerunResearch: 'Rerun market research',
  researchDone: 'Market research complete',

  // Documents
  documentsTitle: 'Documents',
  uploadNotice: 'Upload notice of rent increase',
  noticeUploaded: 'Notice of rent increase uploaded',
  uploadLeaseExtension: 'Upload lease extension agreement',
  leaseExtensionUploaded: 'Lease extension agreement uploaded',
  uploadSigned: 'Record signed agreement',
  signedUploaded: 'Signed agreement recorded',
  signedBy: 'Signed by (optional)',
  signedOn: 'Signed on (optional)',
  reviseTitle: 'Withdraw to correct',
  reviseReason: 'What needs correcting',
  revise: 'Withdraw agreement',
  revised: 'Agreement withdrawn. Correct it and send again.',
  pdfOnly: 'Choose a PDF file.',

  // Notice
  reserveTitle: 'Serve the notice again',
  reserveReason: 'Why (kept on the history, not sent to the tenant)',
  reserve: 'Serve again',
  reserved: 'Notice served again. The 60-day count restarts today.',

  // Negotiation
  reopenTitle: 'Reopen negotiation',
  reopenReason: 'Reason',
  reopen: 'Reopen',
  reopened: 'Negotiation reopened',

  // Postpone and close
  postpone: 'Postpone review',
  postponed: 'Review postponed',
  closeTitle: 'Close review',
  closeHint: 'Record the outcome and close the review. Nobody is notified.',
  closeOutcome: 'Outcome',
  closeOutcomeLabel: {
    [TENANCY_REVIEW_CLOSE_OUTCOME.RENT_INCREASED]: 'Rent increased',
    [TENANCY_REVIEW_CLOSE_OUTCOME.RENT_UNCHANGED]: 'Rent unchanged',
    [TENANCY_REVIEW_CLOSE_OUTCOME.TENANT_VACATE]: 'Tenant is not renewing',
  } satisfies Record<TenancyReviewCloseOutcome, string>,
  closeWeekly: 'New weekly rent ($)',
  closeEffective: 'Increase from',
  closeNote: 'Note (optional)',
  close: 'Close review',
  closed: 'Review closed',

  required: 'Fill in the required fields.',
} as const;
