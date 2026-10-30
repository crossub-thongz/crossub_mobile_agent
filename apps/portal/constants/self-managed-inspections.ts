/**
 * Self-Manage inspections (Phase 1): the agency's own inspectors conduct ingoing, outgoing and
 * routine jobs, booked by the agent with a time and an inspector. The job is complete once the
 * report is in; the principal may sign it off (tenant copy), and Send to owner is its own action
 * (Daniel, 26 Oct 2026). Value sets are typed off the contract DTOs, so a new server value fails
 * the type-check here.
 */

import type { components } from '@crossub-thongz/api-contract';

import { INSPECTION_TYPE } from '@/constants/api-enums';

type Schemas = components['schemas'];

export type AgencyInspectionType = Schemas['AgentCreateAgencyInspectionDto']['type'];
export type AgencyInspectionOwnerCopyStatus = Schemas['AgentInspectionOwnerCopyDto']['status'];
export type AgencyInspectionTenantCopyStatus = NonNullable<
  Schemas['AgentInspectionDetailDto']['tenantCopyStatus']
>;
export type AgentInspectionDetailType = Schemas['AgentInspectionDetailDto']['type'];

/** The types an agency inspector can be booked for. */
export const AGENCY_INSPECTION_TYPE = {
  INGOING: INSPECTION_TYPE.INGOING,
  OUTGOING: INSPECTION_TYPE.OUTGOING,
  ROUTINE: INSPECTION_TYPE.ROUTINE,
} as const satisfies Record<string, AgencyInspectionType>;

export const AGENCY_INSPECTION_TYPES: readonly AgencyInspectionType[] = Object.values(
  AGENCY_INSPECTION_TYPE,
);

/**
 * Only an entry or exit report can be sent back to the inspector (the server returns 400 for
 * routine). These are also the reports the tenant gets a copy of on sign-off.
 */
export const AGENCY_REPORT_TENANT_TYPES: readonly AgentInspectionDetailType[] = [
  INSPECTION_TYPE.INGOING,
  INSPECTION_TYPE.OUTGOING,
];

/** Query string that asks the report PDF endpoint for an attachment instead of a view. */
export const REPORT_PDF_DOWNLOAD_QUERY = 'download=1';

export const AGENCY_INSPECTION_OWNER_COPY_STATUS = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const satisfies Record<string, AgencyInspectionOwnerCopyStatus>;

export const AGENCY_INSPECTION_TENANT_COPY_STATUS = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const satisfies Record<string, AgencyInspectionTenantCopyStatus>;

/** Routine in-person is booked with an agency inspector; tenant self-inspection is not. */
export const ROUTINE_FLOW = {
  SELF: 'self',
  IN_PERSON: 'in_person',
} as const;

/** Server limit mirrored for the input (the DTO enforces it too). */
export const SELF_MANAGED_INSPECTION_LIMITS = {
  rejectReasonMax: 500,
} as const;

export const SELF_MANAGED_INSPECTION_COPY = {
  sectionTitle: 'Run this inspection',
  loading: 'Loading inspection…',
  loadFailed: "Couldn't load this inspection.",
  retry: 'Try again',

  conductedBy: 'Conducted by',
  conductedByTitle: 'Inspector',
  conductedByHint: 'One of your agency inspectors attends. Change it any time before they finish.',
  chooseInspector: 'Choose an inspector…',
  changeInspector: 'Change inspector',
  inspectorChanged: 'Inspector changed',
  noInspectors: 'No one on your team is an inspector yet.',
  addInspectorLink: 'Add one on the Team page',
  inspectorsLoadFailed: "Couldn't load your inspectors.",
  unassigned: 'Not assigned',

  awaitingReportTitle: 'Waiting for the report',
  awaitingReportHint: (name: string) => `${name} has not finished this inspection yet.`,
  awaitingReportNoName: 'The inspector has not finished this inspection yet.',

  reviewTitle: 'Review and sign off',
  reviewHint:
    'The inspection is complete. Sign the report off to email the tenant their copy, or send it back to the inspector.',
  reviewHintRoutine:
    'The inspection is complete. Sign the report off to record your approval.',
  viewReport: 'View report',
  downloadReport: 'Download PDF',
  signOff: 'Sign off report',
  signOffConfirmTitle: 'Sign off this report?',
  signOffConfirmTenant:
    'Signing off emails the tenant their copy now. The owner is not emailed; use Send to owner for that.',
  signOffConfirmRoutine:
    'Signing off records your approval. Nobody is emailed; use Send to owner to email the owner a copy.',
  confirmSignOff: 'Confirm sign-off',
  cancel: 'Cancel',
  signedOffToast: 'Report signed off',
  awaitingPrincipalTitle: 'Waiting for your principal',
  awaitingPrincipalHint:
    'The inspection is complete. Only an agency principal can sign the report off.',

  reject: 'Send back to inspector',
  rejectReason: 'What must the inspector fix?',
  rejectSubmit: 'Send back',
  rejectedToast: 'Report sent back to the inspector',
  declinedTitle: 'Sent back to the inspector',
  declinedReason: (reason: string) => `Reason: ${reason}`,

  sentTitle: 'Signed off',
  signedOffAt: (when: string) => `You signed this report off on ${when}.`,
  tenantCopySent: (when: string) => `Tenant copy emailed ${when}.`,
  tenantCopyPending: 'Tenant copy not emailed yet.',
  tenantCopyFailed: "The tenant copy didn't send. Email the tenant the report yourself.",
  tenantCopySkipped: 'No tenant email on file, so no tenant copy was sent.',

  ownerCopyTitle: 'Owner copy',
  ownerCopyHint: 'Email the owner a copy of the report with the PDF from your agency address.',
  ownerCopyResendHint: 'The report changed since the owner was emailed. Send them the new copy.',
  sendOwnerCopy: 'Send to owner',
  sendOwnerCopyAgain: 'Send again',
  sendOwnerCopyConfirmTitle: 'Send this report to the owner?',
  sendOwnerCopyConfirmBody:
    'The owner gets an email from your agency address with the report PDF attached.',
  confirmSendOwnerCopy: 'Send to owner',
  ownerCopySentToast: 'Report sent to the owner',
  ownerCopySent: (when: string) => `Owner copy emailed ${when}.`,
  ownerCopyFailed: "The owner copy didn't send. Try again, or email the owner the report yourself.",
  ownerCopySkipped: 'No owner email on file, so no owner copy was sent. Add one, then try again.',
} as const;

/** Wizard copy when a Self-Manage agent books an agency-conducted job. */
export const AGENCY_BOOKING_COPY = {
  heading: 'Your agency conducts this inspection',
  hint: 'You set the time and the inspector. There is no CROSSUB charge.',
  routineNoticeHint: 'A routine visit needs the tenant’s written notice period, so pick a date far enough out.',
  scheduledTime: 'Inspection date and time (Sydney time) *',
  conductedBy: 'Conducted by *',
  submit: 'Book inspection',
  submitting: 'Booking…',
  booked: 'Inspection booked',
  needInspector: 'Choose who conducts the inspection',
  needTime: 'Choose the inspection date and time',
  invalidTime: 'The inspection date and time is invalid',
} as const;

/**
 * Who conducts a Self-Manage inspection the agent books: one of the agency's own inspectors
 * (free), or a CROSSUB inspector paid for on this one job at Inspection Only rates, by card
 * before the job starts (Geng Xu 28 Oct, Daniel Zhou 29 Oct 2026).
 */
export const SELF_MANAGED_CONDUCTOR = {
  AGENCY: 'agency',
  CROSSUB: 'crossub',
} as const;

export type SelfManagedConductor =
  (typeof SELF_MANAGED_CONDUCTOR)[keyof typeof SELF_MANAGED_CONDUCTOR];

export const SELF_MANAGED_CONDUCTOR_COPY = {
  heading: 'Who conducts this inspection?',
  options: {
    [SELF_MANAGED_CONDUCTOR.AGENCY]: {
      label: 'Your inspector',
      hint: 'You set the time and the inspector. Free.',
    },
    [SELF_MANAGED_CONDUCTOR.CROSSUB]: {
      label: 'CROSSUB inspector',
      hint: 'CROSSUB books the visit and sends an inspector. Paid per job.',
    },
  },
  crossubPayment:
    'You pay by card when you book, at Inspection Only rates. The amount is shown on the payment screen, and the job is refunded if no inspector accepts it within 48 hours.',
  pricingLink: 'See rates',
} as const satisfies {
  heading: string;
  options: Record<SelfManagedConductor, { label: string; hint: string }>;
  crossubPayment: string;
  pricingLink: string;
};

/**
 * Self-Manage: give one unbooked job of the agency's own to a CROSSUB inspector, paid by card at
 * the Inspection Only rate (Daniel Zhou, 29 Oct 2026). Later routine visits stay with the agency.
 */
export const CROSSUB_INSPECTOR_COPY = {
  title: 'Use a CROSSUB inspector?',
  hint: 'CROSSUB sets the time with the tenant and sends an inspector for this visit. Your inspector comes off this job; later routine visits stay with you.',
  payment:
    'You pay by card now, at Inspection Only rates. The amount is shown on the payment screen, and it is refunded and handed back to you if no CROSSUB inspector accepts within 48 hours.',
  pricingLink: 'See rates',
  action: 'Use a CROSSUB inspector',
  paymentTitle: 'CROSSUB inspector',
  paid: 'Payment received',
  done: 'CROSSUB will set a time and send an inspector',
} as const;

/** Inspections page header entry for Self-Manage agents. */
export const INSPECTIONS_PAGE_ACTIONS = {
  book: 'Book inspection',
} as const;

/** Team page: Self-Manage agency inspectors. */
export const AGENCY_INSPECTOR_TEAM_COPY = {
  badge: 'Inspector',
  makeInspector: 'Make inspector',
  removeInspector: 'Remove inspector',
  granted: 'They can now sign in to the Inspector app',
  revoked: 'Inspector removed',
  removeConfirmTitle: 'Remove this inspector?',
  removeConfirmBody: (name: string) =>
    `${name} stops seeing your agency's jobs in the Inspector app. Their past inspections stay on record. Reassign any open jobs first.`,
  removeConfirm: 'Remove inspector',
  cancel: 'Cancel',
} as const;
