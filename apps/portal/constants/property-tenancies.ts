import type { components } from '@crossub-thongz/api-contract';

import type { PropertyRentPeriod } from '@/constants/property-profile-edit';

/**
 * Self-Manage property Overview cards and Tenancies section (Daniel, 27 Oct 2026): a copy of the
 * admin Property Portal's Property / Tenancy / Owner cards and its Tenancies tab as redesigned in
 * Wayne's PR #37. Statuses, labels and copy mirror `crossub_web/apps/web/constants/property-portal.ts`
 * and `property-overview.ts`; change both together.
 */

type LeaseStatus = components['schemas']['AgentLeaseHistoryDto']['status'];
type CaseType = components['schemas']['AgentTenancyCaseDto']['type'];
type PinStaleReason = NonNullable<
  components['schemas']['AgentCurrentTenancyDto']['pinStaleReason']
>;

/** Shown where no value is recorded. */
export const TENANCY_PLACEHOLDER = '—';

/** Live TENANT contacts a property may hold — mirrors the API's `MAX_PROPERTY_TENANT_CONTACTS`. */
export const MAX_TENANT_CONTACTS = 5;

/** How many names the Overview's upcoming strip prints before "+N". */
export const HOUSEHOLD_PREVIEW_COUNT = 2;

/** Minimum characters before Add tenancy searches people on file. */
export const PEOPLE_SEARCH_MIN_LENGTH = 2;
export const PEOPLE_SEARCH_PAGE_SIZE = 8;
export const PEOPLE_SEARCH_DEBOUNCE_MS = 250;

export const TENANCY_CASE_TYPE = {
  NEW_LEASING: 'new_leasing',
  RENT_REVIEW: 'rent_review',
  TERMINATION: 'termination',
} as const satisfies Record<string, CaseType>;

/** The humanised status of an end of lease that is still running. */
export const TERMINATION_CASE_OPEN_STATUS = 'open';

/** The humanised status of a letting that is still running. */
export const LEASING_CYCLE_ACTIVE_STATUS = 'active';

/** End-of-lease statuses that describe a finished changeover. */
export const TERMINATION_CASE_CLOSED_PATTERN = /completed|cancelled|deleted/i;

export const TENANCY_LEASE_STATUS = {
  SIGNED: 'SIGNED',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  DRAFT: 'DRAFT',
} as const satisfies Record<string, LeaseStatus>;

/** Agreement statuses somebody is still living under — SIGNED counts. */
export const TENANCY_LEASE_RUNNING_STATUSES: readonly LeaseStatus[] = [
  TENANCY_LEASE_STATUS.SIGNED,
  TENANCY_LEASE_STATUS.ACTIVE,
];

/** Maintenance portal statuses that mean a job is over. */
export const MAINTENANCE_TERMINAL_STATUSES: readonly string[] = ['closed', 'deleted'];

/** Rent-review workflow states from the tenant accepting onwards. */
export const RENT_REVIEW_ACCEPTED_STATES: readonly string[] = [
  'TENANT_ACCEPTED',
  'ACCOUNTING',
  'COMPLETED',
];

/** Joined registry names ("A & B", "A and B", "A + B") and the comma inside a proven list. */
export const TENANT_NAME_JOIN_PATTERN = /\s*(?:&|\+|\band\b)\s*/i;
export const TENANT_NAME_COMMA_PATTERN = /\s*,\s*/;

/** Where a row sits: upcoming, living here now, or past. */
export const TENANCY_ROW_GROUP = {
  INCOMING: 'incoming',
  CURRENT: 'current',
  PAST: 'past',
} as const;
export type TenancyRowGroup = (typeof TENANCY_ROW_GROUP)[keyof typeof TENANCY_ROW_GROUP];

export const TENANCY_ROW_GROUP_RANK: Record<TenancyRowGroup, number> = {
  [TENANCY_ROW_GROUP.INCOMING]: 0,
  [TENANCY_ROW_GROUP.CURRENT]: 1,
  [TENANCY_ROW_GROUP.PAST]: 2,
};

/** Which record a row was built from. */
export const TENANCY_ROW_KIND = {
  LEASE: 'lease',
  PENDING_CYCLE: 'pending_cycle',
  PROPERTY_SNAPSHOT: 'property_snapshot',
  ARCHIVED_TENANCY: 'archived_tenancy',
} as const;
export type TenancyRowKind = (typeof TENANCY_ROW_KIND)[keyof typeof TENANCY_ROW_KIND];

export const TENANCY_ROW_STATUS = {
  ACTIVE: 'active',
  PERIODIC: 'periodic',
  VACATING: 'vacating',
  MOVED_OUT: 'moved_out',
  ARCHIVED: 'archived',
  LEASING_IN_PROGRESS: 'leasing_in_progress',
  INCOMING: 'incoming',
} as const;
export type TenancyRowStatus = (typeof TENANCY_ROW_STATUS)[keyof typeof TENANCY_ROW_STATUS];

export const TENANCY_ROW_STATUS_LABEL: Record<TenancyRowStatus, string> = {
  [TENANCY_ROW_STATUS.ACTIVE]: 'Active',
  [TENANCY_ROW_STATUS.PERIODIC]: 'Periodic tenancy',
  [TENANCY_ROW_STATUS.VACATING]: 'Vacating',
  [TENANCY_ROW_STATUS.MOVED_OUT]: 'Moved out',
  [TENANCY_ROW_STATUS.ARCHIVED]: 'Archived',
  [TENANCY_ROW_STATUS.LEASING_IN_PROGRESS]: 'Leasing in progress',
  [TENANCY_ROW_STATUS.INCOMING]: 'Upcoming',
};

export const TENANCY_ROW_STATUS_TONE: Record<TenancyRowStatus, string> = {
  [TENANCY_ROW_STATUS.ACTIVE]: 'border-teal-500/25 bg-teal-500/10 text-teal-900 dark:text-teal-100',
  [TENANCY_ROW_STATUS.PERIODIC]: 'border-teal-500/25 bg-teal-500/10 text-teal-900 dark:text-teal-100',
  [TENANCY_ROW_STATUS.VACATING]:
    'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100',
  [TENANCY_ROW_STATUS.MOVED_OUT]: 'border-border bg-muted/40 text-foreground/80',
  [TENANCY_ROW_STATUS.ARCHIVED]: 'border-border bg-muted/30 text-muted-foreground',
  [TENANCY_ROW_STATUS.LEASING_IN_PROGRESS]:
    'border-violet-500/25 bg-violet-500/10 text-violet-900 dark:text-violet-100',
  [TENANCY_ROW_STATUS.INCOMING]:
    'border-violet-500/25 bg-violet-500/10 text-violet-900 dark:text-violet-100',
};

/** Why a past tenancy is not settled yet, printed under the badge. */
export const TENANCY_MOVED_OUT_REASON = {
  BOND_HELD: 'Bond not released yet',
  NO_CASE: 'No end-leasing case on file',
  JOB_OPEN: 'A job from this tenancy is still open',
  WITHDRAWN_BEFORE_START: 'Withdrawn before move-in',
} as const;
export type TenancyMovedOutReason =
  (typeof TENANCY_MOVED_OUT_REASON)[keyof typeof TENANCY_MOVED_OUT_REASON];

export const TENANCY_LEASE_TERM_TYPE = {
  FIXED: 'fixed',
  PERIODIC: 'periodic',
} as const;
export type TenancyLeaseTermType =
  (typeof TENANCY_LEASE_TERM_TYPE)[keyof typeof TENANCY_LEASE_TERM_TYPE];

export const TENANCY_LEASE_TERM_TYPE_LABEL: Record<TenancyLeaseTermType, string> = {
  [TENANCY_LEASE_TERM_TYPE.FIXED]: 'Fixed term',
  [TENANCY_LEASE_TERM_TYPE.PERIODIC]: 'Periodic',
};

export const CURRENT_TENANCY_PIN_STALE_NOTE: Record<PinStaleReason, string> = {
  missing:
    'The tenancy you chose is no longer on this property, so the current tenant is being worked out from the lease dates again.',
  not_live:
    'The tenancy you chose has ended, so the current tenant is being worked out from the lease dates again.',
};

export const TENANCY_EMPTY_STATE_KIND = {
  NEVER_LET: 'NEVER_LET',
  OCCUPIED_UNRECORDED: 'OCCUPIED_UNRECORDED',
} as const;
export type TenancyEmptyStateKind =
  (typeof TENANCY_EMPTY_STATE_KIND)[keyof typeof TENANCY_EMPTY_STATE_KIND];

export const TENANCY_EMPTY_STATE: Record<TenancyEmptyStateKind, { title: string; body: string }> = {
  [TENANCY_EMPTY_STATE_KIND.NEVER_LET]: {
    title: 'No tenancy history yet',
    body: 'Add a tenancy, or start a letting, to record the first tenant for this property.',
  },
  [TENANCY_EMPTY_STATE_KIND.OCCUPIED_UNRECORDED]: {
    title: 'Occupied, but no tenancy is recorded',
    body:
      'This property is marked Occupied and yet holds no lease, tenant contact or tenant name. ' +
      'Check the household before adding a tenancy: the record is incomplete, not empty.',
  },
};

export const TENANCY_EMPTY_STATE_TONE: Record<TenancyEmptyStateKind, string> = {
  [TENANCY_EMPTY_STATE_KIND.NEVER_LET]: 'border-border/80 bg-muted/20',
  [TENANCY_EMPTY_STATE_KIND.OCCUPIED_UNRECORDED]: 'border-amber-500/40 bg-amber-500/10',
};

/** `Property.leaseStatus` for an occupied property (the empty-state check). */
export const OCCUPIED_LEASE_STATUSES: readonly string[] = ['active', 'periodic', 'vacating'];

export const TENANCY_CARD_WASH: Record<TenancyRowGroup, string> = {
  [TENANCY_ROW_GROUP.INCOMING]: 'from-violet-500/10 to-transparent',
  [TENANCY_ROW_GROUP.CURRENT]: 'from-emerald-500/10 to-transparent',
  [TENANCY_ROW_GROUP.PAST]: 'from-muted/60 to-transparent',
};

export const TENANCY_CARD_ICON_TONE = 'text-emerald-700 dark:text-emerald-300';
export const TENANCY_ALERT_TEXT_TONE = 'text-red-600 dark:text-red-400';
export const TENANCY_ATTENTION_TEXT_TONE = 'text-amber-700 dark:text-amber-300';
export const TENANCY_MEMBER_AVATAR_TONE = 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200';
export const TENANCY_PIN_STALE_TONE =
  'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100';

/** Copy for the Tenancies section. */
export const TENANCY_SECTION_COPY = {
  TITLE: 'Tenancy overview',
  INTRO: 'Current residents and previous tenancy records for this property.',
  INCOMING: 'Upcoming tenancy',
  CURRENT: 'Current tenancy',
  PREVIOUS: 'Past tenancies',
  APPLICANT_PENDING:
    'No applicant approved yet. The household appears here once their agreement is signed.',
  APPLICANT_PENDING_NAME: 'Applicant pending',
  LEASING_IN_PROGRESS: 'Leasing cycle in progress',
  AVAILABLE_FROM: 'Available from',
  PRIMARY: 'Primary',
  PRESENT: 'Present',
  VACANT: 'Vacant',
  VACANT_HINT: 'Nobody holds a tenancy here right now.',
  VACANT_INCOMING: 'Nobody lives here yet. The upcoming tenancy is listed below.',
  ARCHIVE_TENANCY: 'Archive tenancy',
  DRAFT: 'Draft',
  REMOVE_TENANCY: 'Remove tenancy',
  REMOVE_TENANCY_TITLE: 'Remove this tenancy?',
  REMOVE_TENANCY_BODY:
    'Use this when the tenancy was added by mistake. A draft is deleted. An upcoming tenancy is filed under Past tenancies as withdrawn before it started. A tenancy that has started ends through Archive tenancy.',
  REMOVED: 'Tenancy removed',
  REMOVE_FAILED: "Couldn't remove the tenancy",
  PIN_FAILED: "Couldn't change the current tenancy",
  ADD_TENANCY: 'Add tenancy',
  ENDED: 'ended',
  ARCHIVED_LABEL: 'archived',
  MOVE_OUT: 'Move out date',
  PAST_SEARCH: 'Search tenant',
  PAST_NO_MATCH: 'No past tenancy matches that search.',
  WITHDRAW_INCOMING: 'Archive incoming tenancy',
  OPEN_LEASING_CYCLE: 'Open letting',
  OPEN_END_LEASING: 'Open end of lease',
  PIN: 'Set as current tenancy',
  UNPIN: 'Use lease dates instead',
  PINNED: 'Chosen as current',
  PIN_SET: 'Current tenant set to',
  PIN_FALLBACK_NAME: 'this tenancy',
  PIN_CLEARED: 'Back to working the current tenant out from the lease dates',
  RESTORE: 'Restore tenant',
  MORE: 'More actions',
  REGISTRY_TERM: 'Property record holds a lease term of',
  PERSON: 'person',
  PEOPLE: 'people',
  TENANT: 'tenant',
  TENANTS: 'tenants',
  RECORD: 'record',
  RECORDS: 'records',
  PER_WEEK: '/wk',
  BOND_PREFIX: 'Bond',
  PERIOD_SEPARATOR: '→',
  CANCEL: 'Cancel',
} as const;

/** Copy for the Self-Manage Overview cards. */
export const OVERVIEW_CARD_TITLE = {
  PROPERTY: 'Property details',
  TENANCY: 'Tenancy details',
  OWNER: 'Owner details',
} as const;

export const OVERVIEW_ACTION = {
  EDIT: 'Edit',
  ADD_CONTACT: '+ Add contact',
  ADD_OWNER: 'Add owner',
  START_TENANCY: 'Start new tenancy →',
  TENANCY_HISTORY: 'Tenancy history →',
  VIEW_OWNERSHIP: 'View ownership →',
  VIEW_CONTACT: 'View contact',
  VIEW_TENANT_LEDGER: 'View tenant ledger ↗',
  VIEW_OWNER_LEDGER: 'View owner ledger ↗',
  VIEW_DETAILS: 'View details ↗',
  SEND_PORTAL_INVITE: 'Send portal invite',
  SENDING: 'Sending…',
  SET_REFERENCE: 'Set reference',
} as const;

export const OVERVIEW_LABEL = {
  FURNISHED: 'Furnished',
  BEDROOMS: 'Bed',
  BATHROOMS: 'Bath',
  CAR_SPACES: 'Car',
  BUILDING: 'Building',
  ASSIGNED_PROPERTY_MANAGER: 'Assigned property manager',
  BUILDING_MANAGER: 'Building manager',
  STRATA_CONTACT: 'Strata contact',
  PROPERTY_REFERENCE: 'Property reference',
  MANAGEMENT_RATE: 'Management rate',
  LANDLORD_INSURANCE: 'Landlord insurance',
  PHONE: 'Phone',
  EMAIL: 'Email',
  PRIMARY: 'Primary',
  CURRENT_TENANCY: 'Current tenancy',
  FINANCIAL_SUMMARY: 'Financial summary',
  CURRENT_RENT: 'Current rent',
  PAID_TO: 'Paid to',
  BOND: 'Bond',
  RENT_ARREARS: 'Rent arrears',
  UNPAID_INVOICES: 'Unpaid invoices',
  DEPOSIT: 'Deposit',
  PAYMENT_REFERENCE: 'Payment reference',
  TENANTS: 'Tenants',
  AGREEMENT_DATES: 'Agreement & important dates',
  TENANCY_STARTED: 'Tenancy started',
  CURRENT_AGREEMENT: 'Current agreement',
  PREVIOUS_FIXED_TERM: 'Previous fixed term ended',
  NEXT_RENT_REVIEW: 'Next rent review',
  NEXT_ROUTINE_INSPECTION: 'Next routine inspection',
  VACATE_DATE: 'Vacate date',
  PAYMENT_FREQUENCY: 'Payment frequency',
  FUNDS_HELD: 'Funds held',
  PENDING_PAYMENTS: 'Pending payments',
  AVAILABLE_TO_DISBURSE: 'Available to disburse',
  WITHHELD: 'Withheld',
  NEXT_DISBURSEMENT: 'Next disbursement',
  OWNER_CONTACTS: 'Owner contacts',
} as const;

export const OVERVIEW_COPY = {
  YES: 'Yes',
  NO: 'No',
  VACANT: 'Vacant',
  VACANT_HINT: 'No current tenancy on this property.',
  NO_OWNER: 'No owner recorded',
  NOT_RECORDED: 'Not recorded',
  NOT_SCHEDULED: 'Not scheduled',
  NO_FIXED_END: 'No fixed end date',
  CHECK_DATE: 'Check date',
  MORE_PROPERTY_DETAILS: 'More property details',
  ADDITIONAL_TENANCY: 'Additional tenancy details',
  PAYMENT_INSURANCE: 'Payment & insurance details',
  OWNERSHIP_RECORD: 'Ownership record',
  PRIMARY_OWNERSHIP: 'Primary ownership',
  OWNERS_SUFFIX: 'owners',
  RECORDED_AMOUNT: 'Recorded amount',
  LODGEMENT_NOT_PROVIDED: 'Lodgement details not provided',
  TRUST_ACCOUNTING_NOTE: 'Trust figures are on the Trust screens.',
  GST_INCLUDE: 'incl. GST',
  GST_EXCLUDE: 'excl. GST',
  MOVING_IN: 'Moving in',
  EVERY_MONTHS_PREFIX: 'Every',
  EVERY_MONTHS_SUFFIX: 'months',
  PER_YEAR_SUFFIX: '× per year',
  RENT_FROM: 'from',
  LOADING: 'Loading tenancy details…',
} as const;

export const OVERVIEW_CARD_TONE = {
  PROPERTY: {
    chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    wash: 'from-sky-500/10 to-transparent',
    avatar: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  },
  TENANCY: {
    chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    wash: 'from-emerald-500/10 to-transparent',
    avatar: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  },
  OWNER: {
    chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    wash: 'from-violet-500/10 to-transparent',
    avatar: 'bg-violet-500/15 text-violet-800 dark:text-violet-200',
  },
} as const;

export const OVERVIEW_DUE_DATE_TONE = 'text-amber-800 dark:text-amber-200';

/** `managementRateGst` values. */
export const MANAGEMENT_RATE_GST = {
  INCLUDE: 'include',
  EXCLUDE: 'exclude',
} as const;

/** Copy for the tenancy dialogs. */
export const ADD_TENANCY_COPY = {
  TITLE: 'Add tenancy',
  STEPS: ['Tenants', 'Lease details', 'Financial', 'Review'],
  STEP_OF: 'Step',
  TENANT_LIST: 'Tenant list',
  TENANT_LIST_HINT: 'Choose someone already on file, or add a new person. Both appear in this list.',
  NO_TENANTS: 'No tenants yet',
  NO_CONTACT: 'No contact yet',
  NEW_TENANT: 'New tenant',
  SEARCH: 'Search saved tenants',
  SEARCHING: 'Searching…',
  SELECT: 'Select',
  SELECTED: 'Selected',
  FIRST_NAME: 'First name',
  SURNAME: 'Surname',
  EMAIL: 'Email',
  PHONE: 'Phone',
  ADD_TO_LIST: 'Add to tenant list',
  NEW_TENANT_REQUIRED: 'A new tenant needs a first name, surname, email and phone',
  TENANT_LIMIT: `A tenancy can have at most ${MAX_TENANT_CONTACTS} tenants`,
  LEASE_START: 'Lease start',
  LEASE_END: 'Lease end',
  VACATE_DATE: 'Vacate date',
  RENT_WEEKLY: 'Rent / week',
  BOND: 'Bond',
  RENT_PAID_TO: 'Rent paid to',
  TENANTS: 'Tenants',
  DETAILS: 'Tenancy details',
  SAVE_DRAFT: 'Save draft',
  BACK: 'Back',
  NEXT: 'Next',
  SUBMIT: 'Add tenancy',
  SAVED_DRAFT: 'Draft tenancy saved',
  SAVED_UPCOMING: 'Tenancy added under Upcoming tenancy',
  SAVED: 'Tenancy added',
  CONTACTS_LEFT_OFF: "The property's tenant contact list is full, so these were not added to it:",
  FAILED: "Couldn't add the tenancy",
  NO_AGENCY: 'People on file are not available for this property.',
} as const;

export const ARCHIVE_TENANCY_COPY = {
  DESCRIPTION_NAMED: 'Files {name} away and leaves the property ready for the next tenancy.',
  DESCRIPTION: 'Files the current tenancy away and leaves the property ready for the next tenancy.',
  OPEN_CASE_TITLE: 'An end of lease is still open:',
  OPEN_CASE_BODY:
    'Archiving cancels this open vacating task. Finish it first if the bond or final charges are not settled. Restoring the tenancy later does not reopen a case cancelled here.',
  KEPT_TITLE: 'Kept: you can find it again on Tenancies',
  KEPT_BODY:
    'The tenancy is saved with its dates, rent and bond and appears under Past tenancies as Archived, with every tenant and their own email and phone. Rent stays on the property as the asking rent. If you archive the wrong tenancy, Restore tenant on that row puts it back.',
  CLEARED_TITLE: 'Cleared, ready for the new tenant',
  CLEARED: [
    'Tenant name, email and phone',
    'Lease start and lease end',
    'Next rent review',
    'Rent paid to',
    'Vacate date',
    'Bond',
    'Property status set to Vacant',
  ],
  INCOMING_NOTE:
    'The household moving in is not affected. Use Archive incoming tenancy on its card.',
  DONE: 'Tenancy archived',
  FAILED: "Couldn't archive the tenancy",
} as const;

export const RESTORE_TENANCY_COPY = {
  DESCRIPTION_NAMED: 'Puts {name} back on this property as the current tenancy.',
  DESCRIPTION: 'Puts this tenancy back on the property as the current one.',
  RESTORED_TITLE: 'Restored to the property',
  RESTORED: [
    'Tenant name, email and phone',
    'Every tenant on the tenancy, with their own contact details',
    'Lease start and lease end',
    'Rent paid to',
    'Bond',
    'Property status set back to Occupied',
  ],
  NOT_RESTORED_TITLE: 'Not restored',
  NOT_RESTORED_BODY:
    'The vacate date stays cleared, or the archive sweep would file these tenants away again. An end of lease that archiving cancelled stays cancelled. Rent never left the property.',
  DONE: 'Tenancy restored',
  FAILED: "Couldn't restore the tenancy",
} as const;

export const WITHDRAW_INCOMING_COPY = {
  TITLE: 'Archive incoming tenancy',
  DESCRIPTION:
    'Use this when the household signed to move in is no longer moving in. It ends their signed agreement and files them under Past tenancies. It does not touch anyone living here now.',
  MEMBERS_HEADING: 'Household moving in',
  WHAT_HAPPENS_HEADING: 'What this does',
  WHAT_HAPPENS: [
    'Their signed agreements end and the household is filed under Past tenancies as Archived.',
    'This cannot be undone. To bring them back, start a new letting.',
    'The letting closes and can still be found under closed cases.',
    'Their tenant app access ends.',
    'The current household and the property details are not changed.',
  ],
  REASON_LABEL: 'Why is this household not moving in?',
  REASON_PLACEHOLDER: 'e.g. Approved applicants withdrew before signing day',
  CONFIRM: 'Archive incoming tenancy',
  DONE: 'Incoming tenancy archived',
  FAILED: "Couldn't archive the incoming tenancy",
} as const;

export const TENANT_DETAILS_COPY = {
  TITLE: 'Tenant details',
  DESCRIPTION:
    'Saves to the tenant, their tenant app login, their contact on this property and the notice details where they hold them.',
  FIRST_NAME: 'First name',
  LAST_NAME: 'Surname',
  EMAIL: 'Email',
  PHONE: 'Phone',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DONE: 'Tenant updated',
  NOTHING: 'Nothing changed',
  FAILED: "Couldn't save the tenant",
} as const;

export const EDIT_TENANCY_COPY = {
  TITLE: 'Edit tenancy',
  DESCRIPTION: 'Update the tenants and the lease details.',
  TENANTS: 'Tenants',
  NO_TENANTS: 'No tenant contacts yet',
  ADD_TENANT: 'Add tenant',
  NOTICE_NAME: 'Name (all parties)',
  NOTICE_HINT: 'One line for the whole household: the name statutory notices are served to.',
  NOTICE_EMAIL: 'Notice email',
  NOTICE_PHONE: 'Notice phone',
  LEASE_TYPE: 'Lease type',
  LEASE_START: 'Lease start date',
  LEASE_END: 'Lease end date',
  VACATE_DATE: 'Vacate date',
  VACATE_ON_CASE: 'Change it on the open end of lease',
  NEXT_RENT_REVIEW: 'Next rent review date',
  RENT_PERIOD: 'Rent period',
  RENT: 'Rent ($)',
  PAYMENT_REFERENCE: 'Payment reference',
  BOND: 'Bond ($)',
  DEPOSIT: 'Deposit ($)',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DONE: 'Tenancy updated',
  FAILED: "Couldn't update this tenancy",
  NOTICE_NAME_REQUIRED: 'Enter the name statutory notices are served to',
  LEASE_START_REQUIRED: 'Enter the lease start date',
  LEASE_END_REQUIRED: 'Enter the lease end date for a fixed term',
  INVALID_AMOUNT: 'Enter amounts as numbers',
} as const;

export const EDIT_OWNERS_COPY = {
  TITLE: 'Owner details',
  DESCRIPTION: 'The owners of this property. The primary owner receives notices and statements.',
  OWNERS: 'Owners',
  NO_OWNERS: 'No owners recorded',
  ADD_OWNER: 'Add owner',
  AGREEMENT: 'Management & insurance',
  INSURANCE_EXPIRY: 'Landlord insurance expiry',
  MANAGEMENT_RATE: 'Management rate (%)',
  MANAGEMENT_RATE_GST: 'GST',
  GST_UNSET: 'Not set',
  SAVE: 'Save',
  CLOSE: 'Close',
  SAVED: 'Owner details saved',
  FAILED: "Couldn't save owner details",
  INVALID_RATE: 'Management rate must be between 0 and 100',
  REGISTRY_NAME_REQUIRED: "Enter the owner's name",
} as const;

/** Shared by the tenant and owner contact lists in Edit tenancy and Owner details. */
export const CONTACT_EDITOR_COPY = {
  NAME: 'Name',
  EMAIL: 'Email',
  PHONE: 'Phone',
  ADD: 'Add',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  EDIT: 'Edit',
  REMOVE: 'Remove',
  CONFIRM_REMOVE: 'Confirm remove',
  MAKE_PRIMARY: 'Make primary',
  PRIMARY: 'Primary',
  REQUIRED: 'Enter a name, email or phone',
  SAVED: 'Contact saved',
  ADDED: 'Contact added',
  REMOVED: 'Contact removed',
  PRIMARY_SET: 'Primary updated',
  FAILED: "Couldn't save the contact",
  LIMIT: `A property can have at most ${MAX_TENANT_CONTACTS} tenants`,
  INVITE_SENT: 'Tenant app login emailed to',
} as const;

/** What removing a contact does, said before it is done. */
export const CONTACT_REMOVE_CONFIRM: Record<'TENANT' | 'LANDLORD', string> = {
  TENANT:
    'Ends their tenancy here and signs them out of the tenant app. Anyone else on the lease stays.',
  LANDLORD: "Removes them from this property's owner contacts.",
};

export const PAYMENT_REFERENCE_COPY = {
  TITLE: 'Payment reference',
  DESCRIPTION: 'The reference the tenant quotes when paying rent by bank transfer.',
  LABEL: 'Reference',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DONE: 'Payment reference saved',
  FAILED: "Couldn't save the payment reference",
} as const;

export const PORTAL_INVITE_COPY = {
  SENT: 'Tenant app login emailed to',
  NO_CONTACT: 'Add this tenant as a contact with an email first (Edit tenancy).',
  FAILED: "Couldn't send the portal invite",
} as const;

/** What `PATCH .../tenants/:personId` reports it changed (`updated`), as the toast reads it. */
export const TENANT_RECORD_LAYER_LABEL: Record<string, string> = {
  person: 'tenant record',
  login_user: 'their tenant app login',
  property_contact: 'property contact',
  registry_scalar: 'notice recipient',
};

/** Why the property's notice name was left alone (`registrySkipped`). */
export const REGISTRY_NAME_SKIP_NOTE: Record<string, string> = {
  empty: '',
  not_named:
    'The notice recipient on this property names someone else. Correct it in Edit tenancy if it is wrong.',
  ambiguous:
    'The notice recipient names this spelling more than once, so it was left alone. Correct it in Edit tenancy.',
};

/** `tenantPortalInvite.status` when adding a TENANT contact emailed them a login. */
export const TENANT_INVITE_STATUS_SENT = 'sent';

/** Weeks in each rent period — mirrors the admin web `RENT_PERIOD_WEEKS`. */
export const RENT_PERIOD_WEEKS: Record<PropertyRentPeriod, number> = {
  WEEKLY: 1,
  FORTNIGHTLY: 2,
  MONTHLY: 52 / 12,
  YEARLY: 52,
};

export const RENT_PERIOD_SUFFIX: Record<PropertyRentPeriod, string> = {
  WEEKLY: '/ week',
  FORTNIGHTLY: '/ fortnight',
  MONTHLY: '/ month',
  YEARLY: '/ year',
};
