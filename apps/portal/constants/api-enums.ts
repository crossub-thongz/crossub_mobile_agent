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

/** CommDepartment — the staff queue a message thread is routed to. */
export const COMM_DEPARTMENT = {
  LEASING: 'LEASING',
  MAINTENANCE: 'MAINTENANCE',
  INSPECTION: 'INSPECTION',
  ACCOUNTING: 'ACCOUNTING',
  TRIBUNAL: 'TRIBUNAL',
  GENERAL: 'GENERAL',
} as const;

/** CommChannel — the medium a single message was sent on. */
export const COMM_CHANNEL = {
  APP: 'APP',
  EMAIL: 'EMAIL',
  VOICE: 'VOICE',
  INTERNAL_NOTE: 'INTERNAL_NOTE',
  PUSH: 'PUSH',
} as const;
