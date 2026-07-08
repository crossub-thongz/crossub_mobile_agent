/**
 * End Leasing Termination Dashboard Constants
 * Command center for all lease termination operations
 */

import { LEASING_TONE, LEASING_UI, type LeasingTone } from '@/lib/leasing/constants';

/** Termination module chrome — light-mode readable variants of the leasing palette. */
export const TERMINATION_UI = {
  sectionLabel: LEASING_UI.sectionLabel,
  stageBadge:
    "inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:text-violet-200",
  tribunalBadge:
    "inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-800 dark:text-rose-200",
  overdueText: "text-rose-700 dark:text-rose-300",
  countdownUrgent: "text-sky-700 dark:text-sky-300",
  countdownOnTrack: "text-emerald-700 dark:text-emerald-300",
  debtText: "text-rose-700 dark:text-rose-300",
  refundText: "text-emerald-700 dark:text-emerald-300",
  progressPercent: "font-semibold text-violet-800 dark:text-violet-200",
  nextActionBox: "border-violet-500/30 bg-violet-500/[0.08]",
  nextActionBoxCritical: "border-rose-500/35 bg-rose-500/[0.07]",
  tabActive: LEASING_UI.tabActive,
  btnAction: LEASING_UI.btnSecondary,
  btnSuccess: LEASING_UI.btnSuccess,
  btnRejectHover: "hover:text-rose-700 dark:hover:text-rose-200",
  activityIconActive: "text-violet-700 dark:text-violet-300",
  iconChip: LEASING_UI.iconChip,
  rowArrow:
    "text-violet-700 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 dark:text-violet-300",
  kpiDefault: LEASING_UI.kpiDefault,
  kpiDestructive: LEASING_UI.kpiDestructive,
  deletedBadge:
    "inline-flex items-center rounded-full border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:text-rose-200",
} as const

/** System-of-record status for a live-ops termination case. */
export const TERMINATION_CASE_STATUS = {
  OPEN: "open",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const

export type TerminationCaseStatus =
  (typeof TERMINATION_CASE_STATUS)[keyof typeof TERMINATION_CASE_STATUS]

export const TERMINATION_CASE_STATUS_LABEL: Record<TerminationCaseStatus, string> = {
  [TERMINATION_CASE_STATUS.OPEN]: "Active",
  [TERMINATION_CASE_STATUS.COMPLETED]: "Completed",
  [TERMINATION_CASE_STATUS.CANCELLED]: "Deleted",
}

// Termination Stage IDs for the pipeline. Landlord terminations start with the
// statutory notice; tenant vacates skip straight to key return.
export const TERMINATION_STAGE = {
  TERMINATION_NOTICE: "termination_notice",
  KEY_RETURN: "key_return",
  OUTGOING_INSPECTION: "outgoing_inspection",
  MAINTENANCE: "maintenance",
  BOND: "bond",
} as const

export type TerminationStage =
  (typeof TERMINATION_STAGE)[keyof typeof TERMINATION_STAGE]

export const TERMINATION_STAGE_ORDER: TerminationStage[] = [
  TERMINATION_STAGE.TERMINATION_NOTICE,
  TERMINATION_STAGE.KEY_RETURN,
  TERMINATION_STAGE.OUTGOING_INSPECTION,
  TERMINATION_STAGE.MAINTENANCE,
  TERMINATION_STAGE.BOND,
]

export const TENANT_VACATE_STAGE_ORDER: TerminationStage[] = [
  TERMINATION_STAGE.KEY_RETURN,
  TERMINATION_STAGE.OUTGOING_INSPECTION,
  TERMINATION_STAGE.MAINTENANCE,
  TERMINATION_STAGE.BOND,
]

export const TERMINATION_STAGE_LABEL: Record<TerminationStage, string> = {
  [TERMINATION_STAGE.TERMINATION_NOTICE]: "Termination Notice",
  [TERMINATION_STAGE.KEY_RETURN]: "Key Return",
  [TERMINATION_STAGE.OUTGOING_INSPECTION]: "Outgoing Inspection",
  [TERMINATION_STAGE.MAINTENANCE]: "Maintenance",
  [TERMINATION_STAGE.BOND]: "Bond",
}

export const TERMINATION_STAGE_SHORT_LABEL: Record<TerminationStage, string> = {
  [TERMINATION_STAGE.TERMINATION_NOTICE]: "Notice",
  [TERMINATION_STAGE.KEY_RETURN]: "Keys",
  [TERMINATION_STAGE.OUTGOING_INSPECTION]: "Inspection",
  [TERMINATION_STAGE.MAINTENANCE]: "Maintenance",
  [TERMINATION_STAGE.BOND]: "Bond",
}

/** Stages that are optional and may be skipped in the lifecycle. */
export const TERMINATION_OPTIONAL_STAGES: TerminationStage[] = [
  TERMINATION_STAGE.MAINTENANCE,
]

// Termination Types — two only: a tenant-initiated end, or a
// landlord/agent-driven termination (breach, non-renewal, mutual, abandonment).
export const TERMINATION_TYPE = {
  TERMINATION: "termination",
  TENANT_INITIATED: "tenant_initiated",
} as const

export type TerminationType =
  (typeof TERMINATION_TYPE)[keyof typeof TERMINATION_TYPE]

export const TERMINATION_TYPE_LABEL: Record<TerminationType, string> = {
  [TERMINATION_TYPE.TERMINATION]: "Termination",
  // Tenant-initiated end of lease, shown as a plain "Vacate".
  [TERMINATION_TYPE.TENANT_INITIATED]: "Vacate",
}

/** Stage rail for a case — landlord terminations include the notice step first. */
export function terminationStageOrderForCase(
  terminationType: TerminationType,
): TerminationStage[] {
  return terminationType === TERMINATION_TYPE.TERMINATION
    ? TERMINATION_STAGE_ORDER
    : TENANT_VACATE_STAGE_ORDER
}

/** NSW FT6600 statutory grounds — landlord-initiated termination notice. */
export const TERMINATION_NOTICE_GROUND = {
  ACTUAL_SALE: "actual_sale",
  PROPOSED_SALE: "proposed_sale",
  RENOVATIONS: "renovations",
  DEMOLITION: "demolition",
  NOT_RESIDENTIAL: "not_residential",
  LANDLORD_RESIDES: "landlord_resides",
  BREACH: "breach",
  NON_PAYMENT: "non_payment",
  EMPLOYEE_CARETAKER: "employee_caretaker",
  UNINHABITABLE: "uninhabitable",
  DEATH_SOLE_TENANT: "death_sole_tenant",
} as const

export type TerminationNoticeGround =
  (typeof TERMINATION_NOTICE_GROUND)[keyof typeof TERMINATION_NOTICE_GROUND]

export const TERMINATION_NOTICE_GROUND_LABEL: Record<TerminationNoticeGround, string> = {
  [TERMINATION_NOTICE_GROUND.ACTUAL_SALE]: "Actual sale of premises (Section 87D)",
  [TERMINATION_NOTICE_GROUND.PROPOSED_SALE]: "Proposed sale of premises (Section 87E)",
  [TERMINATION_NOTICE_GROUND.RENOVATIONS]: "Significant renovations or repairs (Section 87F)",
  [TERMINATION_NOTICE_GROUND.DEMOLITION]: "Demolition of premises (Section 87G)",
  [TERMINATION_NOTICE_GROUND.NOT_RESIDENTIAL]:
    "Not used as rented residential premises (Section 87L)",
  [TERMINATION_NOTICE_GROUND.LANDLORD_RESIDES]:
    "Landlord or family will reside at the premises (Section 87M)",
  [TERMINATION_NOTICE_GROUND.BREACH]: "Breach of tenancy agreement (Section 87C)",
  [TERMINATION_NOTICE_GROUND.NON_PAYMENT]: "Non-payment of rent or charges (Section 88)",
  [TERMINATION_NOTICE_GROUND.EMPLOYEE_CARETAKER]:
    "Employee or caretaker agreement ended (Section 87N)",
  [TERMINATION_NOTICE_GROUND.UNINHABITABLE]:
    "Property uninhabitable — agreement frustrated (Section 109)",
  [TERMINATION_NOTICE_GROUND.DEATH_SOLE_TENANT]: "Death of a sole tenant (Section 108)",
}

export const TERMINATION_NOTICE_GROUND_OPTIONS = Object.values(TERMINATION_NOTICE_GROUND).map(
  (value) => ({
    value,
    label: TERMINATION_NOTICE_GROUND_LABEL[value],
  }),
)

// SLA Risk States
export const TERMINATION_SLA_RISK = {
  ON_TRACK: "on_track",
  DUE_SOON: "due_soon",
  OVERDUE: "overdue",
  CRITICAL: "critical",
} as const

export type TerminationSlaRisk =
  (typeof TERMINATION_SLA_RISK)[keyof typeof TERMINATION_SLA_RISK]

export const TERMINATION_SLA_RISK_LABEL: Record<TerminationSlaRisk, string> = {
  [TERMINATION_SLA_RISK.ON_TRACK]: "On Track",
  [TERMINATION_SLA_RISK.DUE_SOON]: "Due Soon",
  [TERMINATION_SLA_RISK.OVERDUE]: "Overdue",
  [TERMINATION_SLA_RISK.CRITICAL]: "Critical",
}

// Property Recovery Status
export const PROPERTY_RECOVERY_STATUS = {
  READY_FOR_LEASING: "ready_for_leasing",
  UNDER_MAINTENANCE: "under_maintenance",
  CLEANING_IN_PROGRESS: "cleaning_in_progress",
  AWAITING_INSPECTION: "awaiting_inspection",
  TRIBUNAL_HOLD: "tribunal_hold",
  NOT_FOR_LEASE: "not_for_lease",
} as const

export type PropertyRecoveryStatus =
  (typeof PROPERTY_RECOVERY_STATUS)[keyof typeof PROPERTY_RECOVERY_STATUS]

export const PROPERTY_RECOVERY_STATUS_LABEL: Record<
  PropertyRecoveryStatus,
  string
> = {
  [PROPERTY_RECOVERY_STATUS.READY_FOR_LEASING]: "Ready For Leasing",
  [PROPERTY_RECOVERY_STATUS.UNDER_MAINTENANCE]: "Under Maintenance",
  [PROPERTY_RECOVERY_STATUS.CLEANING_IN_PROGRESS]: "Cleaning In Progress",
  [PROPERTY_RECOVERY_STATUS.AWAITING_INSPECTION]: "Awaiting Inspection",
  [PROPERTY_RECOVERY_STATUS.TRIBUNAL_HOLD]: "Tribunal Hold",
  [PROPERTY_RECOVERY_STATUS.NOT_FOR_LEASE]: "Not For Lease",
}

// SLA Targets (in hours)
export const SLA_TARGETS = {
  INITIAL_REVIEW: { target: 24, label: "Initial Review" },
  LEGAL_REVIEW: { target: 48, label: "Legal Review" },
  INSPECTION: { target: 72, label: "Inspection" },
  ACCOUNTING: { target: 48, label: "Accounting" },
  AGENT_APPROVAL: { target: 24, label: "Agent Approval" },
  BOND_PROCESSING: { target: 120, label: "Bond Processing" },
  LEASE_CLOSURE: { target: 168, label: "Lease Closure" },
} as const

/** Business days after vacate / key return to target the outgoing inspection. */
export const OUTGOING_INSPECTION_DAYS_AFTER_VACATE = 3

/** Hours the tenant has to accept or decline bond deductions after agent review. */
export const TENANT_SETTLEMENT_CONFIRMATION_HOURS = 48

/** Tenant response to the proposed bond deduction. */
export const TENANT_SETTLEMENT_CONFIRMATION = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
} as const

export type TenantSettlementConfirmation =
  (typeof TENANT_SETTLEMENT_CONFIRMATION)[keyof typeof TENANT_SETTLEMENT_CONFIRMATION]

export const TENANT_SETTLEMENT_CONFIRMATION_LABEL: Record<
  TenantSettlementConfirmation,
  string
> = {
  [TENANT_SETTLEMENT_CONFIRMATION.PENDING]: "Awaiting tenant",
  [TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED]: "Accepted",
  [TENANT_SETTLEMENT_CONFIRMATION.DECLINED]: "Declined",
}

export const TENANT_SETTLEMENT_CONFIRMATION_TONE: Record<
  TenantSettlementConfirmation,
  LeasingTone
> = {
  [TENANT_SETTLEMENT_CONFIRMATION.PENDING]: LEASING_TONE.WARNING,
  [TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED]: LEASING_TONE.SUCCESS,
  [TENANT_SETTLEMENT_CONFIRMATION.DECLINED]: LEASING_TONE.DESTRUCTIVE,
}

// KPI IDs for the dashboard
export const TERMINATION_KPI_ID = {
  ACTIVE_TERMINATION_CASES: "active_termination_cases",
  PENDING_REVIEW: "pending_review",
  LEGAL_RISK_CASES: "legal_risk_cases",
  AWAITING_INSPECTION: "awaiting_inspection",
  AWAITING_ACCOUNTING: "awaiting_accounting",
  AWAITING_AGENT_APPROVAL: "awaiting_agent_approval",
  BOND_PROCESSING: "bond_processing",
  READY_FOR_RE_LEASING: "ready_for_re_leasing",
} as const

export type TerminationKpiId =
  (typeof TERMINATION_KPI_ID)[keyof typeof TERMINATION_KPI_ID]

export const TERMINATION_KPI_LABEL: Record<TerminationKpiId, string> = {
  [TERMINATION_KPI_ID.ACTIVE_TERMINATION_CASES]: "Active Termination Cases",
  [TERMINATION_KPI_ID.PENDING_REVIEW]: "Pending Review",
  [TERMINATION_KPI_ID.LEGAL_RISK_CASES]: "Legal Risk Cases",
  [TERMINATION_KPI_ID.AWAITING_INSPECTION]: "Awaiting Inspection",
  [TERMINATION_KPI_ID.AWAITING_ACCOUNTING]: "Awaiting Accounting",
  [TERMINATION_KPI_ID.AWAITING_AGENT_APPROVAL]: "Awaiting Agent Approval",
  [TERMINATION_KPI_ID.BOND_PROCESSING]: "Bond Processing",
  [TERMINATION_KPI_ID.READY_FOR_RE_LEASING]: "Ready For Re-Leasing",
}

// Activity Event Types
export const ACTIVITY_EVENT_TYPE = {
  TERMINATION_CREATED: "termination_created",
  TRIBUNAL_DOCUMENTS_UPLOADED: "tribunal_documents_uploaded",
  VACATE_DATE_CONFIRMED: "vacate_date_confirmed",
  INSPECTION_COMPLETED: "inspection_completed",
  MAINTENANCE_CREATED: "maintenance_created",
  SETTLEMENT_APPROVED: "settlement_approved",
  BOND_REFUNDED: "bond_refunded",
  LEASE_CLOSED: "lease_closed",
} as const

export type ActivityEventType =
  (typeof ACTIVITY_EVENT_TYPE)[keyof typeof ACTIVITY_EVENT_TYPE]

export const ACTIVITY_EVENT_TYPE_LABEL: Record<ActivityEventType, string> = {
  [ACTIVITY_EVENT_TYPE.TERMINATION_CREATED]: "Termination case created",
  [ACTIVITY_EVENT_TYPE.TRIBUNAL_DOCUMENTS_UPLOADED]:
    "Tribunal documents uploaded",
  [ACTIVITY_EVENT_TYPE.VACATE_DATE_CONFIRMED]: "Vacate date confirmed",
  [ACTIVITY_EVENT_TYPE.INSPECTION_COMPLETED]: "Inspection completed",
  [ACTIVITY_EVENT_TYPE.MAINTENANCE_CREATED]: "Maintenance request created",
  [ACTIVITY_EVENT_TYPE.SETTLEMENT_APPROVED]: "Settlement approved",
  [ACTIVITY_EVENT_TYPE.BOND_REFUNDED]: "Bond refunded",
  [ACTIVITY_EVENT_TYPE.LEASE_CLOSED]: "Lease closed",
}

// Routes
export const END_LEASING_ROUTE = {
  TERMINATION_DASHBOARD: "/leasing/end-leasing",
} as const

/* -------------------------------------------------------------------------- */
/* Consolidated per-case dashboard — view + tone mapping                       */
/* -------------------------------------------------------------------------- */

/** Card grid vs table on the Terminations dashboard. */
export const TERMINATION_CASE_VIEW = {
  GRID: "grid",
  LIST: "list",
} as const

export type TerminationCaseView =
  (typeof TERMINATION_CASE_VIEW)[keyof typeof TERMINATION_CASE_VIEW]

/** SLA risk → shared leasing tone (for the SLA badge). */
export const TERMINATION_SLA_RISK_TONE: Record<TerminationSlaRisk, LeasingTone> = {
  [TERMINATION_SLA_RISK.ON_TRACK]: LEASING_TONE.SUCCESS,
  [TERMINATION_SLA_RISK.DUE_SOON]: LEASING_TONE.WARNING,
  [TERMINATION_SLA_RISK.OVERDUE]: LEASING_TONE.DESTRUCTIVE,
  [TERMINATION_SLA_RISK.CRITICAL]: LEASING_TONE.DESTRUCTIVE,
}

/** Agent sign-off decision in the Settlement phase. */
export const TERMINATION_AGENT_DECISION = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  ADJUSTMENT: "adjustment_required",
} as const

export type TerminationAgentDecision =
  (typeof TERMINATION_AGENT_DECISION)[keyof typeof TERMINATION_AGENT_DECISION]

export const TERMINATION_AGENT_DECISION_LABEL: Record<
  TerminationAgentDecision,
  string
> = {
  [TERMINATION_AGENT_DECISION.PENDING]: "Pending agent",
  [TERMINATION_AGENT_DECISION.APPROVED]: "Approved",
  [TERMINATION_AGENT_DECISION.REJECTED]: "Rejected",
  [TERMINATION_AGENT_DECISION.ADJUSTMENT]: "Adjustment required",
}

export const TERMINATION_AGENT_DECISION_TONE: Record<
  TerminationAgentDecision,
  LeasingTone
> = {
  [TERMINATION_AGENT_DECISION.PENDING]: LEASING_TONE.WARNING,
  [TERMINATION_AGENT_DECISION.APPROVED]: LEASING_TONE.SUCCESS,
  [TERMINATION_AGENT_DECISION.REJECTED]: LEASING_TONE.DESTRUCTIVE,
  [TERMINATION_AGENT_DECISION.ADJUSTMENT]: LEASING_TONE.WARNING,
}

/** Bond/settlement financial outcome. */
export const TERMINATION_OUTCOME = {
  REFUND: "refund",
  FULLY_APPLIED: "fully_applied",
  SHORTFALL: "shortfall",
} as const

export type TerminationOutcome =
  (typeof TERMINATION_OUTCOME)[keyof typeof TERMINATION_OUTCOME]

export const TERMINATION_OUTCOME_LABEL: Record<TerminationOutcome, string> = {
  [TERMINATION_OUTCOME.REFUND]: "Refund due",
  [TERMINATION_OUTCOME.FULLY_APPLIED]: "Bond fully applied",
  [TERMINATION_OUTCOME.SHORTFALL]: "Shortfall — debt raised",
}

export const TERMINATION_OUTCOME_TONE: Record<TerminationOutcome, LeasingTone> = {
  [TERMINATION_OUTCOME.REFUND]: LEASING_TONE.SUCCESS,
  [TERMINATION_OUTCOME.FULLY_APPLIED]: LEASING_TONE.INFO,
  [TERMINATION_OUTCOME.SHORTFALL]: LEASING_TONE.DESTRUCTIVE,
}
