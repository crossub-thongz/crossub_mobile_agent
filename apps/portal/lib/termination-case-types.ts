import type {
  PropertyRecoveryStatus,
  TerminationAgentDecision,
  TerminationOutcome,
  TerminationSlaRisk,
  TerminationStage,
  TerminationType,
  TenantSettlementConfirmation,
} from '@/constants/end-leasing';
import type { LeasingItemStatus } from '@/lib/leasing/constants';

/**
 * API-response shapes for the End-Leasing termination workflow
 * (`/api/end-leasing/cases/*`). These mirror the server `TerminationCaseView`
 * (apps/api/.../termination-case.mapping.ts): enum COLUMNS arrive as lowercase FE
 * literals, money as `number | null`, dates as ISO strings. The client
 * (`lib/termination-case-api.ts`) maps these into the component-facing
 * `TerminationCaseDetail`, deriving the header fields the lean server view omits
 * (riskScore, daysRemaining, nextAction, assignedStaff — see the mapper).
 */

type Resp = "tenant" | "landlord" | "shared"

export interface ServerTerminationSummary {
  id: string
  taskNumber: string | null
  propertyId: string | null
  propertyAddress: string | null
  tenantName: string | null
  status: string
  stage: string
  currentStage: TerminationStage
  terminationType: TerminationType
  slaRisk: TerminationSlaRisk
  tribunalInvolved: boolean
  vacateDate: string | null
  initialVacateDate: string | null
  vacateDateChanged: boolean
  vacateDateChangedAt: string | null
  vacateDateChangedBy: string | null
  createdAt: string
  updatedAt: string
  cancellationReason: string | null
  cancelledAt: string | null
  cancelledBy: string | null
}

export interface ServerTerminationCase extends ServerTerminationSummary {
  tenantEmail?: string | null
  tenantPhone?: string | null
  agentName?: string | null
  terminationReason: string | null
  bondPortalLink?: string | null
  leaseStartDate?: string | null
  leaseEndDate?: string | null
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
  financial: {
    bondHeld: number | null
    totalDeductions: number | null
    refundAmount: number | null
    debtAmount: number | null
    outcome: TerminationOutcome | null
  }
  vacate: {
    status: LeasingItemStatus
    keysReturned: boolean
    keysReturnAddress: string | null
    noticeEffectiveDate: string | null
    expectedVacateDate: string | null
    actualVacateDate: string | null
    possessionRegainedDate: string | null
  }
  vacatingPreparation: {
    exitCleaningConfirmed: boolean
    exitCleaningConfirmedAt: string | null
    exitCleaningConfirmedBy: string | null
    moveOutServices: string
    vacateDateChangeReason: string | null
    keyReturnPhotoUrls: string[]
    tenantKeyReturnSubmittedAt: string | null
  }
  overviewEmail: {
    commConversationId: string | null
    subject: string | null
    body: string | null
    from: string | null
    to: string | null
    sentAt: string | null
  } | null
  inspection: {
    status: LeasingItemStatus
    inspectorName: string | null
    inspectionDate: string | null
    overallCondition: string | null
    issuesFound: number
    tenantChargeableItems: number
    reportAvailable: boolean
    inspectionId: string | null
    ingoingInspectionId: string | null
    ingoingReportUrl: string | null
    outgoingReportUrl: string | null
    tenantAttendance: string
  }
  reportComparison: {
    agentAcknowledged: boolean
    agentAcknowledgedAt: string | null
    tenantAcknowledged: boolean
    tenantAcknowledgedAt: string | null
    tenantResponsibility: {
      area: string
      description: string
      quote?: string | null
      handymanId?: string | null
      handymanName?: string | null
      maintenanceRequestId?: string | null
      bondDeductible?: boolean
  landlordWaivable?: boolean | null
      bondDeductionStaffComment?: string | null
      bondDeductionAgentComment?: string | null
    }[]
    landlordResponsibility: {
      area: string
      description: string
      quote?: string | null
      handymanId?: string | null
      handymanName?: string | null
      maintenanceRequestId?: string | null
      bondDeductible?: boolean
  landlordWaivable?: boolean | null
      bondDeductionStaffComment?: string | null
      bondDeductionAgentComment?: string | null
    }[]
    tenantResponsibilityStaffComment?: string | null
    tenantResponsibilityStaffCommentAt?: string | null
    landlordResponsibilityStaffComment?: string | null
    landlordResponsibilityStaffCommentAt?: string | null
    tenantResponsibilityAgentComment?: string | null
    tenantResponsibilityAgentCommentAt?: string | null
    landlordResponsibilityAgentComment?: string | null
    landlordResponsibilityAgentCommentAt?: string | null
    draftSummaryEmail: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    tenantComparisonSummaryEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    agentComparisonSummaryEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    landlordComparisonSummaryEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    staffCommentsToAgentEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    landlordPropertyUpdateEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    tenantRepairQuoteEmail: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    tenantBondDeductionAckEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    agentBondDeductionProposalEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    landlordRepairQuoteEmail: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    agentRepairQuoteEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    agentLandlordQuoteResponse?: 'none' | 'pending' | 'approved' | 'declined' | null
    agentLandlordQuoteRespondedAt?: string | null
    agentLandlordQuoteDeclineReason?: string | null
    agentQuoteConfirmed?: boolean
    agentQuoteConfirmedAt?: string | null
    tenantQuoteResponse: 'pending' | 'accepted' | 'declined' | null
    tenantQuoteResponseAt: string | null
    tenantQuoteDeclineReason: string | null
    tenantQuoteReplyExcerpt: string | null
    tenantAcknowledgedPrice: string | null
    settlementSummary: {
      unpaidRent: number
      unpaidBills: number
      maintenanceCost: number
      bondHeld: number
      netRefund: number
      debtAmount: number
    } | null
    tenantBondSummaryEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    landlordBondSummaryEmail?: {
      commConversationId: string | null
      subject: string | null
      body: string | null
      from: string | null
      to: string | null
      sentAt: string | null
    } | null
    manualInspectionReports?: EndLeasingManualInspectionReport[]
  }
  makeGood: {
    status: LeasingItemStatus
    issueCount: number
    tenantItems: number
    landlordItems: number
    sharedItems: number
    estimatedDeductions: number | null
    qaComplete: boolean
    maintenanceRequestId: string | null
  }
  settlement: {
    status: LeasingItemStatus
    bondHeld: number | null
    totalDeductions: number | null
    refundAmount: number | null
    debtAmount: number | null
    outcome: TerminationOutcome | null
    managerApprovalRequired: boolean
    managerApprovalComplete: boolean
    deductions: {
      id: string
      category: string
      description: string | null
      amount: number
      responsibility: Resp
    }[]
  }
  agentApproval: {
    status: LeasingItemStatus
    decision: TerminationAgentDecision
    evidenceComplete: boolean
    proposedDeductions: number | null
  }
  tenantConfirmation: {
    status: TenantSettlementConfirmation
    dueAt: string | null
    declineReason: string | null
    confirmedAt: string | null
  }
  bond: {
    status: LeasingItemStatus
    refundAmount: number | null
    debtBalance: number | null
    outcome: TerminationOutcome | null
    refundPaid: boolean
    disbursementId: string | null
    debtArrearsCaseId: string | null
  }
  closure: {
    status: LeasingItemStatus
    recommendedPropertyStatus: PropertyRecoveryStatus | null
    selectedPropertyStatus: PropertyRecoveryStatus | null
    checklistComplete: number
    checklistTotal: number
    checklistBlocking: number
    suggestedWeeklyRent: number | null
    targetAvailableDate: string | null
    releasingNotified: boolean
    newLeasingCycleId: string | null
  }
  documents: {
    id: string
    name: string
    verified: boolean
    uploadedAt: string
  }[]
  timeline: {
    id: string
    label: string
    kind: string
    actor: string
    at: string
  }[]
}

export interface TerminationListResult {
  cases: ServerTerminationSummary[]
  total: number
}

/** Inbound write payloads. */
export interface ScheduleInspectionInput {
  inspector: string
  date: string
  platformChargeId?: string
}

export interface UpdateReportComparisonInput {
  agentAcknowledged?: boolean
  tenantAcknowledged?: boolean
  tenantResponsibility?: ReportComparisonRepairItemInput[]
  landlordResponsibility?: ReportComparisonRepairItemInput[]
  tenantResponsibilityStaffComment?: string
  landlordResponsibilityStaffComment?: string
  tenantResponsibilityAgentComment?: string
  landlordResponsibilityAgentComment?: string
  tenantResponsibilityAgentAcknowledged?: boolean
  landlordResponsibilityAgentAcknowledged?: boolean
}

export interface ReportComparisonRepairItemInput {
  area: string
  description: string
  quote?: string
  handymanId?: string
  handymanName?: string
  bondDeductible?: boolean
  landlordWaivable?: boolean
  bondDeductionStaffComment?: string
  bondDeductionAgentComment?: string
}

export type RepairQuoteEmailAudience = 'tenant' | 'landlord' | 'agent'

export type ComparisonSummaryEmailAudience =
  | 'tenant'
  | 'agent'
  | 'landlord'
  | 'agent_staff_comments'
  | 'landlord_property_update'

export interface UpdateMakeGoodInput {
  issueCount?: number
  tenantItems?: number
  landlordItems?: number
  sharedItems?: number
  estimatedDeductions?: number
}

export interface CreateTerminationCaseInput {
  propertyId: string
  terminationType?: TerminationType
  terminationReason?: string
  bondHeld?: number
  expectedVacateDate?: string
  tenancyAgreementId?: string
  leasingCycleId?: string
  terminationGround?: import('@/constants/end-leasing').TerminationNoticeGround;
  proposedTerminationDate?: string
  breachClause?: string
  breachConduct?: string
}

export interface EndLeasingManualInspectionReport {
  id: string
  kind: 'ingoing' | 'outgoing'
  fileName: string
  uploadedAt: string
  uploadedById: string
  uploadedByName: string
  uploadedByRole: 'agent' | 'admin'
}

export interface UploadTerminationDocumentInput {
  fileName: string
  mimeType: string
  sizeBytes: number
  contentBase64: string
}

export interface UploadManualInspectionReportInput extends UploadTerminationDocumentInput {
  kind: 'ingoing' | 'outgoing'
}
