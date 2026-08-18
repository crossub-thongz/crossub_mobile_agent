/**
 * Runtime mirrors of the CROSSUB API's Prisma enums. The typed contract
 * (`@crossub-thongz/api-contract`) ships these as string-literal *types* only — there are
 * no runtime values to compare against — so the agent mappers import these constants
 * instead of hard-coding raw strings (per the repo's "no raw string comparisons" rule).
 *
 * Keep in sync with `apps/api/prisma/schema.prisma`.
 */

/** InspectionType — what kind of inspection. */
export const INSPECTION_TYPE = {
  CONDITION: 'CONDITION',
  ROUTINE: 'ROUTINE',
  INGOING: 'INGOING',
  OUTGOING: 'OUTGOING',
  WARD_ROUND: 'WARD_ROUND',
  OPEN: 'OPEN',
} as const;

/** InspectionStatus — the persisted lifecycle of an inspection. */
export const INSPECTION_STATUS = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  FIRST_REVIEW: 'FIRST_REVIEW',
  SECOND_REVIEW: 'SECOND_REVIEW',
  COMPLETED: 'COMPLETED',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
} as const;

/** MaintenanceStatus — the persisted lifecycle of a maintenance request. */
export const MAINTENANCE_STATUS = {
  OPEN: 'OPEN',
  APPROVED: 'APPROVED',
  QUOTING: 'QUOTING',
  SCHEDULED: 'SCHEDULED',
  INVOICED: 'INVOICED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

/** MaintenanceOrderType — who the work is for / responsibility hint. */
export const MAINTENANCE_ORDER_TYPE = {
  TENANT_REQUEST: 'TENANT_REQUEST',
  PROPERTY_MAINTENANCE: 'PROPERTY_MAINTENANCE',
  STRATA: 'STRATA',
  UNKNOWN: 'UNKNOWN',
} as const;

/** ApplicationStatus — leasing application lifecycle. */
export const APPLICATION_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  LEASED: 'LEASED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

/** LeaseStatus — tenancy-agreement lifecycle. */
export const LEASE_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PARTIALLY_SIGNED: 'PARTIALLY_SIGNED',
  SIGNED: 'SIGNED',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
} as const;

/** RentReviewWorkflowState — the live rent-review workflow position. */
export const RENT_REVIEW_WORKFLOW_STATE = {
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  AGENT_REVIEW: 'AGENT_REVIEW',
  TENANT_NOTIFIED: 'TENANT_NOTIFIED',
  NEGOTIATION: 'NEGOTIATION',
  TENANT_ACCEPTED: 'TENANT_ACCEPTED',
  TENANT_REJECTED: 'TENANT_REJECTED',
  ACCOUNTING: 'ACCOUNTING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  POSTPONED: 'POSTPONED',
} as const;

/** TribunalCaseStatus — dispute lifecycle. */
export const TRIBUNAL_CASE_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  AWAITING_HEARING: 'AWAITING_HEARING',
  HEARING_SCHEDULED: 'HEARING_SCHEDULED',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
} as const;

/** VacatingStatus — end-of-lease closure state. */
export const VACATING_STATUS = {
  OPEN: 'OPEN',
  COMPLETED: 'COMPLETED',
} as const;

/** TerminationStage — end-leasing pipeline position (mirrors Prisma). */
export const TERMINATION_STAGE = {
  VACATE: 'VACATE',
  OUTGOING_INSPECTION: 'OUTGOING_INSPECTION',
  MAKE_GOOD: 'MAKE_GOOD',
  SETTLEMENT: 'SETTLEMENT',
  AGENT_APPROVAL: 'AGENT_APPROVAL',
  BOND: 'BOND',
  CLOSURE: 'CLOSURE',
} as const;

/** LeasingLifecycleStep — active leasing cycle position (mirrors Prisma). */
export const LEASING_LIFECYCLE_STEP = {
  OPEN_INSPECTION: 'open_inspection',
  OPEN_REPORT: 'open_report',
  APPLICATION_APPROVAL: 'application_approval',
  ONBOARDING: 'onboarding',
} as const;

/** Leasing onboarding sub-steps when lifecycle is ONBOARDING. */
export const LEASING_ONBOARDING_STEP = {
  DEPOSIT: 'deposit',
  BOND: 'bond',
  AGREEMENT: 'agreement',
  KEY_COLLECTION: 'key_collection',
  INGOING_INSPECTION: 'ingoing_inspection',
  INGOING_REPORT_APPROVAL: 'ingoing_report_approval',
} as const;

/** CommDepartment — the staff queue a message thread is routed to. */
export const COMM_DEPARTMENT = {
  LEASING: 'LEASING',
  MAINTENANCE: 'MAINTENANCE',
  INSPECTION: 'INSPECTION',
  ACCOUNTING: 'ACCOUNTING',
  TRIBUNAL: 'TRIBUNAL',
  GENERAL: 'GENERAL',
  // Added on the API between contract 0.13.0 and 0.14.0. A thread routed to either of
  // these arrived here with no category at all until they were listed.
  RENT_REVIEW: 'RENT_REVIEW',
  COMPLAINT: 'COMPLAINT',
} as const;

/** CommChannel — the medium a single message was sent on. */
export const COMM_CHANNEL = {
  APP: 'APP',
  EMAIL: 'EMAIL',
  VOICE: 'VOICE',
  INTERNAL_NOTE: 'INTERNAL_NOTE',
  PUSH: 'PUSH',
} as const;

/** AgentNotificationType — the agent notification kind (mirrors the app's view union). */
export const AGENT_NOTIFICATION_TYPE = {
  APPROVAL: 'APPROVAL',
  URGENT: 'URGENT',
  UPDATE: 'UPDATE',
  REPORT: 'REPORT',
  REMINDER: 'REMINDER',
} as const;

/** AgencyStatus — the client-agency lifecycle. */
export const AGENCY_STATUS = {
  ONBOARDING: 'ONBOARDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

/** Agent document category — the agent-facade document vocabulary (matches the view union). */
export const DOCUMENT_CATEGORY = {
  INSPECTION: 'inspection',
  RENT_REVIEW: 'rent_review',
  MAINTENANCE: 'maintenance',
  LEASE: 'lease',
  VACATING: 'vacating',
} as const;

/** PropertyType — registry property classification (mirrors `schema.prisma`). */
export const PROPERTY_TYPE = {
  APARTMENT: 'APARTMENT',
  HOUSE: 'HOUSE',
  TOWNHOUSE: 'TOWNHOUSE',
  UNIT: 'UNIT',
  STUDIO: 'STUDIO',
} as const;

export type PropertyType = (typeof PROPERTY_TYPE)[keyof typeof PROPERTY_TYPE];

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  [PROPERTY_TYPE.APARTMENT]: 'Apartment',
  [PROPERTY_TYPE.HOUSE]: 'House',
  [PROPERTY_TYPE.TOWNHOUSE]: 'Townhouse',
  [PROPERTY_TYPE.UNIT]: 'Unit',
  [PROPERTY_TYPE.STUDIO]: 'Studio',
};

export const PROPERTY_TYPE_ORDER: PropertyType[] = [
  PROPERTY_TYPE.APARTMENT,
  PROPERTY_TYPE.HOUSE,
  PROPERTY_TYPE.TOWNHOUSE,
  PROPERTY_TYPE.UNIT,
  PROPERTY_TYPE.STUDIO,
];

/** PropertyStatus — registry occupancy / marketing state. */
export const PROPERTY_STATUS = {
  OCCUPIED: 'OCCUPIED',
  VACANT: 'VACANT',
  SHOWING: 'SHOWING',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export type PropertyStatus = (typeof PROPERTY_STATUS)[keyof typeof PROPERTY_STATUS];

export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  [PROPERTY_STATUS.OCCUPIED]: 'Occupied',
  [PROPERTY_STATUS.VACANT]: 'Vacant',
  [PROPERTY_STATUS.SHOWING]: 'Showing',
  [PROPERTY_STATUS.MAINTENANCE]: 'Maintenance',
};

export const PROPERTY_STATUS_ORDER: PropertyStatus[] = [
  PROPERTY_STATUS.OCCUPIED,
  PROPERTY_STATUS.VACANT,
  PROPERTY_STATUS.SHOWING,
  PROPERTY_STATUS.MAINTENANCE,
];

/**
 * PropertyApprovalStatus — whether CROSSUB has confirmed it services a property you
 * registered here.
 *
 * CROSSUB's field team cannot reach every area. A property you add stays `PENDING` until
 * they answer: the registry record is yours to edit the whole time, but every workflow on
 * it — leasing, inspections, maintenance, rent reviews — is refused until it is approved.
 * `DECLINED` is the "we do not cover this area" answer and carries a reason.
 */
export const PROPERTY_APPROVAL_STATUS = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  DECLINED: 'DECLINED',
} as const;

export type PropertyApprovalStatus =
  (typeof PROPERTY_APPROVAL_STATUS)[keyof typeof PROPERTY_APPROVAL_STATUS];

export const PROPERTY_APPROVAL_STATUS_LABEL: Record<PropertyApprovalStatus, string> = {
  [PROPERTY_APPROVAL_STATUS.APPROVED]: 'Approved',
  [PROPERTY_APPROVAL_STATUS.PENDING]: 'Awaiting CROSSUB approval',
  [PROPERTY_APPROVAL_STATUS.DECLINED]: 'Not serviced by CROSSUB',
};

/** True when CROSSUB has confirmed the address — i.e. workflows are unlocked. */
export function isPropertyServiceApproved(
  status: PropertyApprovalStatus | undefined,
): boolean {
  // Undefined means an API that predates the gate: treat as approved so this app never
  // blocks a property the server would happily accept work on.
  return status === undefined || status === PROPERTY_APPROVAL_STATUS.APPROVED;
}

/** Why a workflow button is disabled — shown on the property, in its own words. */
export function propertyApprovalBlockMessage(
  status: PropertyApprovalStatus,
  declineReason?: string,
): string {
  if (status === PROPERTY_APPROVAL_STATUS.DECLINED) {
    return declineReason?.trim()
      ? `CROSSUB does not service this property: ${declineReason.trim()}`
      : 'CROSSUB does not service this property. Contact your account manager.';
  }
  return 'CROSSUB is confirming it services this address. You can keep editing the details — workflows unlock once it is approved.';
}

/** Australian states & territories — required on property registry intake. */
export const AUSTRALIAN_STATE = {
  NSW: 'NSW',
  VIC: 'VIC',
  QLD: 'QLD',
  SA: 'SA',
  WA: 'WA',
  TAS: 'TAS',
  ACT: 'ACT',
  NT: 'NT',
} as const;

export type AustralianStateKey = (typeof AUSTRALIAN_STATE)[keyof typeof AUSTRALIAN_STATE];

export const AUSTRALIAN_STATE_ORDER: AustralianStateKey[] = [
  AUSTRALIAN_STATE.NSW,
  AUSTRALIAN_STATE.VIC,
  AUSTRALIAN_STATE.QLD,
  AUSTRALIAN_STATE.SA,
  AUSTRALIAN_STATE.WA,
  AUSTRALIAN_STATE.TAS,
  AUSTRALIAN_STATE.ACT,
  AUSTRALIAN_STATE.NT,
];

export const AUSTRALIAN_STATE_LABEL: Record<AustralianStateKey, string> = {
  [AUSTRALIAN_STATE.NSW]: 'New South Wales',
  [AUSTRALIAN_STATE.VIC]: 'Victoria',
  [AUSTRALIAN_STATE.QLD]: 'Queensland',
  [AUSTRALIAN_STATE.SA]: 'South Australia',
  [AUSTRALIAN_STATE.WA]: 'Western Australia',
  [AUSTRALIAN_STATE.TAS]: 'Tasmania',
  [AUSTRALIAN_STATE.ACT]: 'Australian Capital Territory',
  [AUSTRALIAN_STATE.NT]: 'Northern Territory',
};
