// Rich per-termination-case record for the consolidated End Leasing dashboard.
// One `TerminationCaseDetail` carries the whole 10-stage lifecycle as
// summarised per-stage sub-states (each with a generic `status` that drives the
// StepCard badge + phase rail). Authored coherently in termination-case-seed.ts
// (the underlying per-stage mocks are seeded independently), so we don't
// cross-join — mirrors how LeasingPropertyDetail was built for New Leasing.

import type {
  PropertyRecoveryStatus,
  TerminationAgentDecision,
  TerminationCaseStatus,
  TerminationOutcome,
  TerminationSlaRisk,
  TerminationStage,
  TerminationType,
  TenantSettlementConfirmation,
} from '@/constants/end-leasing';
import type { LeasingItemStatus } from '@/lib/leasing/constants';

export interface TerminationStaff {
  name: string
  initials: string
  role: string
}

export interface TerminationActivityEvent {
  id: string
  label: string
  timestamp: string
  actor?: string
  kind?: "stage" | "legal" | "inspection" | "settlement" | "system"
}

export interface TerminationDocument {
  id: string
  name: string
  uploadedAt?: string
  verified?: boolean
}

/* ----------------------------- Phase sub-states --------------------------- */

export interface VacateStageState {
  status: LeasingItemStatus
  noticeEffectiveDate?: string
  expectedVacateDate?: string
  actualVacateDate?: string
  possessionRegainedDate?: string
  keysReturned: boolean
  keysReturnAddress?: string
}

export type MoveOutServicesChoice = 'pending' | 'booked' | 'declined' | 'own_arrangement'
export type TenantOutgoingAttendance = 'yes' | 'no'
export type TenantOutgoingAttendanceStatus = TenantOutgoingAttendance | 'pending'

export interface VacatingPreparationStageState {
  exitCleaningConfirmed: boolean
  exitCleaningConfirmedAt?: string
  exitCleaningConfirmedBy?: 'tenant' | 'agent'
  moveOutServices: MoveOutServicesChoice
  vacateDateChangeReason?: string
}

export interface EndLeasingOverviewEmail {
  commConversationId?: string
  subject?: string
  body?: string
  from?: string
  to?: string
  sentAt?: string
}

export interface InspectionStageState {
  status: LeasingItemStatus
  inspectorName?: string
  inspectionDate?: string
  overallCondition?: string
  issuesFound: number
  tenantChargeableItems: number
  reportAvailable: boolean
  /** Backend OUTGOING inspection row — opens Outgoing Inspection module. */
  inspectionId?: string | null
  /** Linked ingoing inspection from the active leasing cycle. */
  ingoingInspectionId?: string | null
  ingoingReportUrl?: string | null
  outgoingReportUrl?: string | null
  tenantAttendance: TenantOutgoingAttendanceStatus
}

export interface ReportComparisonRepairItem {
  area: string
  description: string
  quote?: string
  handymanId?: string | null
  handymanName?: string | null
  /** Client-only stable key for compare-step draft rows (not sent to API). */
  localKey?: string
}

export type TenantQuoteResponse = 'pending' | 'accepted' | 'declined'

export interface ReportComparisonSettlementSummary {
  unpaidRent: number
  unpaidBills: number
  maintenanceCost: number
  bondHeld: number
  netRefund: number
  debtAmount: number
}

export interface ReportComparisonStageState {
  agentAcknowledged: boolean
  agentAcknowledgedAt?: string | null
  tenantAcknowledged: boolean
  tenantAcknowledgedAt?: string | null
  tenantResponsibility: ReportComparisonRepairItem[]
  landlordResponsibility: ReportComparisonRepairItem[]
  draftSummaryEmail?: EndLeasingOverviewEmail | null
  tenantComparisonSummaryEmail?: EndLeasingOverviewEmail | null
  agentComparisonSummaryEmail?: EndLeasingOverviewEmail | null
  tenantRepairQuoteEmail?: EndLeasingOverviewEmail | null
  landlordRepairQuoteEmail?: EndLeasingOverviewEmail | null
  agentRepairQuoteEmail?: EndLeasingOverviewEmail | null
  agentQuoteConfirmed?: boolean
  agentQuoteConfirmedAt?: string | null
  tenantQuoteResponse?: TenantQuoteResponse | null
  tenantQuoteResponseAt?: string | null
  tenantQuoteDeclineReason?: string | null
  tenantQuoteReplyExcerpt?: string | null
  settlementSummary?: ReportComparisonSettlementSummary | null
}

export interface MakeGoodStageState {
  status: LeasingItemStatus
  issueCount: number
  tenantItems: number
  landlordItems: number
  sharedItems: number
  estimatedDeductions: number
  qaComplete: boolean
  /** Spawned maintenance job when make-good completes with issues. */
  maintenanceRequestId?: string | null
}

export interface SettlementDeductionLine {
  id: string
  category: string
  description: string
  amount: number
  responsibility: "tenant" | "landlord" | "shared"
}

export interface SettlementStageState {
  status: LeasingItemStatus
  bondHeld: number
  totalDeductions: number
  refundAmount: number
  debtAmount: number
  outcome: TerminationOutcome
  managerApprovalRequired: boolean
  managerApprovalComplete: boolean
  deductions: SettlementDeductionLine[]
}

export interface AgentApprovalStageState {
  status: LeasingItemStatus
  decision: TerminationAgentDecision
  agent?: string
  evidenceComplete: boolean
  proposedDeductions?: number
}

export interface TenantConfirmationStageState {
  status: TenantSettlementConfirmation
  dueAt?: string
  declineReason?: string
  confirmedAt?: string
}

export interface BondStageState {
  status: LeasingItemStatus
  refundAmount: number
  debtBalance: number
  outcome: TerminationOutcome
  refundPaid: boolean
  readiness: { label: string; done: boolean }[]
}

export interface ClosureStageState {
  status: LeasingItemStatus
  recommendedPropertyStatus: PropertyRecoveryStatus
  selectedPropertyStatus: PropertyRecoveryStatus | null
  checklistComplete: number
  checklistTotal: number
  checklistBlocking: number
  suggestedWeeklyRent?: number
  targetAvailableDate?: string
  releasingNotified: boolean
}

/* ------------------------------ The full record --------------------------- */

export interface TerminationCaseDetail {
  id: string
  /** TRM-YYYY-NNNN */
  caseId: string
  propertyId?: string | null
  property: {
    name: string
    address: string
    suburb?: string
    type?: string
    unit?: string
  }
  tenant: { name: string; email?: string; phone?: string; avatarInitials?: string }
  status: TerminationCaseStatus
  terminationType: TerminationType
  currentStage: TerminationStage
  slaStatus: TerminationSlaRisk
  /** 0–100. */
  riskScore: number
  daysRemaining: number
  createdAt: string
  /** Date the termination/lease takes effect. */
  terminationDate?: string | null
  /** Plain-language reason the lease is ending. */
  terminationReason?: string
  cancellationReason?: string
  cancelledAt?: string
  /** Who withdrew — `agent` or `tenant`. */
  cancelledBy?: string
  /** Current lease term start (ISO date). */
  leaseStartDate?: string | null
  /** Current lease term end (ISO date). */
  leaseEndDate?: string | null
  vacateDate?: string | null
  /** Original vacate date when the case was opened. */
  initialVacateDate?: string | null
  vacateDateChanged?: boolean
  vacateDateChangedAt?: string
  vacateDateChangedBy?: string
  /** Managing agency / agent company name. */
  agencyName?: string
  /** Listing agent contact name (detail view). */
  agentName?: string
  tribunalInvolved: boolean
  assignedTeam: string
  assignedStaff: TerminationStaff[]
  nextAction: string

  /** State bond portal URL from the origin leasing cycle (onboarding bond link). */
  bondPortalLink?: string | null

  // Financial summary (header)
  bondHeld: number
  outstandingRent: number
  totalDeductions: number
  refundAmount: number
  debtAmount: number

  documents: TerminationDocument[]
  timeline: TerminationActivityEvent[]

  // Per-stage summarised data (Termination Created is represented by case meta)
  vacate: VacateStageState
  vacatingPreparation: VacatingPreparationStageState
  overviewEmail?: EndLeasingOverviewEmail | null
  inspection: InspectionStageState
  reportComparison: ReportComparisonStageState
  makeGood: MakeGoodStageState
  settlement: SettlementStageState
  agentApproval: AgentApprovalStageState
  tenantConfirmation: {
    status: TenantSettlementConfirmation
    dueAt?: string
    declineReason?: string
    confirmedAt?: string
  }
  terminationNotice?: {
    ground: string | null
    groundLabel: string | null
    terminationDate: string | null
    noticeEmailSentAt: string | null
    tenantVacateDate: string | null
    tenantVacateDateProvidedAt: string | null
    breachClause: string | null
    breachConduct: string | null
    noticePeriodDays: number | null
    emailVariant: string | null
    emailSent: boolean
  } | null
  bond: BondStageState
  closure: ClosureStageState
}
