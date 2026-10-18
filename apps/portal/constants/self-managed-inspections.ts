/**
 * Self-Manage inspections (Phase 1): the agency's own inspectors conduct ingoing, outgoing and
 * routine jobs, booked by the agent with a time and an inspector, and the principal signs the
 * report off. Value sets are typed off the contract DTOs, so a new server value fails the
 * type-check here.
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

/** Report download filename kind per inspection type (`buildInspectionReportFilename`). */
export const INSPECTION_REPORT_FILENAME_KIND: Record<
  AgentInspectionDetailType,
  'ingoing' | 'outgoing' | 'routine' | 'open'
> = {
  [INSPECTION_TYPE.INGOING]: 'ingoing',
  [INSPECTION_TYPE.OUTGOING]: 'outgoing',
  [INSPECTION_TYPE.ROUTINE]: 'routine',
  [INSPECTION_TYPE.CONDITION]: 'routine',
  [INSPECTION_TYPE.WARD_ROUND]: 'routine',
  [INSPECTION_TYPE.OPEN]: 'open',
};

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
    'Read the report, then sign it off or send it back. Nothing goes to the tenant or owner until you sign off.',
  reviewHintRoutine:
    'Read the report, then sign it off. Nothing goes to the owner until you sign off.',
  viewReport: 'View report',
  downloadReport: 'Download PDF',
  downloadFailed: "Couldn't download the report.",
  signOff: 'Sign off report',
  signOffConfirmTitle: 'Sign off this report?',
  signOffConfirmTenantOwner:
    'Signing off emails the tenant their copy now and emails the owner a copy with the PDF from your agency address.',
  signOffConfirmOwner:
    'Signing off emails the owner a copy with the PDF from your agency address.',
  confirmSignOff: 'Confirm sign-off',
  cancel: 'Cancel',
  signedOffToast: 'Report signed off',
  awaitingPrincipalTitle: 'Waiting for your principal',
  awaitingPrincipalHint: 'Only an agency principal can sign this report off.',

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
  ownerCopySent: (when: string) => `Owner copy emailed ${when}.`,
  ownerCopyFailed: "The owner copy didn't send. Email the owner the report yourself.",
  ownerCopySkipped: 'No owner email on file, so no owner copy was sent.',
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
