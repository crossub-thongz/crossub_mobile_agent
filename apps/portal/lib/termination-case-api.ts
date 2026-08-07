import {
  PROPERTY_RECOVERY_STATUS,
  TERMINATION_AGENT_DECISION,
  TERMINATION_CASE_STATUS,
  TERMINATION_OUTCOME,
  TERMINATION_STAGE,
  TENANT_SETTLEMENT_CONFIRMATION,
  TERMINATION_TYPE,
  type TerminationSlaRisk,
  type TerminationStage,
  type TerminationCaseStatus,
} from '@/constants/end-leasing';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { api } from '@/lib/api';
import type {
  CreateTerminationCaseInput,
  ScheduleInspectionInput,
  ServerTerminationCase,
  TerminationListResult,
  UpdateMakeGoodInput,
  UpdateReportComparisonInput,
  RepairQuoteEmailAudience,
  ComparisonSummaryEmailAudience,
} from '@/lib/termination-case-types';
import type {
  BondStageState,
  InspectionStageState,
  ReportComparisonRepairItem,
  TerminationActivityEvent,
  TerminationCaseDetail,
  VacatingPreparationStageState,
} from '@/lib/end-leasing/types';

/** Build a `?a=b&c=d` query string, skipping undefined / empty values. */
function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

// --- derivations for the header fields the lean server view omits -----------

/** Approximate risk score from the SLA risk band (the backend tracks slaRisk, not a 0–100 score). */
const RISK_BY_SLA: Record<TerminationSlaRisk, number> = {
  on_track: 25,
  due_soon: 55,
  overdue: 80,
  critical: 95,
}

/** Next-action copy keyed by the current (4-tab) stage. */
const NEXT_ACTION_BY_STAGE: Record<TerminationStage, string> = {
  [TERMINATION_STAGE.TERMINATION_NOTICE]: "Awaiting tenant vacate date",
  [TERMINATION_STAGE.KEY_RETURN]: "Confirm key return",
  [TERMINATION_STAGE.OUTGOING_INSPECTION]: "Complete outgoing inspection",
  [TERMINATION_STAGE.MAINTENANCE]: "Complete make-good",
  [TERMINATION_STAGE.BOND]: "Finalise settlement & bond refund",
}

function daysUntil(date: string | null): number {
  if (!date) return 0
  const ms = new Date(date).getTime() - Date.now()
  return Math.round(ms / 86_400_000)
}

function initials(name: string | null): string {
  if (!name) return "—"
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")
}

const n0 = (v: number | null): number => v ?? 0
const undef = (v: string | null): string | undefined => v ?? undefined

function mapOverviewEmail(
  email:
    | {
        commConversationId: string | null
        subject: string | null
        body: string | null
        from: string | null
        to: string | null
        sentAt: string | null
      }
    | null
    | undefined,
) {
  if (!email?.body && !email?.subject) return null
  return {
    commConversationId: email.commConversationId ?? undefined,
    subject: email.subject ?? undefined,
    body: email.body ?? undefined,
    from: email.from ?? undefined,
    to: email.to ?? undefined,
    sentAt: undef(email.sentAt),
  }
}

function mapRepairItems(
  items: ServerTerminationCase['reportComparison']['tenantResponsibility'] | undefined,
): ReportComparisonRepairItem[] {
  return (items ?? []).map((item) => ({
    area: item.area,
    description: item.description,
    quote: item.quote ?? undefined,
    handymanId: item.handymanId ?? null,
    handymanName: item.handymanName ?? undefined,
  }));
}

/** Derive the bond readiness checklist the FE renders (not modelled server-side). */
function bondReadiness(s: ServerTerminationCase): BondStageState["readiness"] {
  const agentReviewed =
    s.agentApproval?.decision === TERMINATION_AGENT_DECISION.APPROVED ||
    s.agentApproval?.decision === TERMINATION_AGENT_DECISION.ADJUSTMENT
  return [
    {
      label: "Settlement finalised",
      done: s.settlement?.status === LEASING_ITEM_STATUS.DONE,
    },
    { label: "Agent reviewed", done: agentReviewed },
    {
      label: "Tenant confirmed",
      done: s.tenantConfirmation?.status === TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED,
    },
    { label: "Refund paid", done: s.bond?.refundPaid ?? false },
  ]
}

/**
 * Map a lean server termination case → the rich `TerminationCaseDetail` the
 * components consume. The 7-stage sub-states, financials, deductions, timeline and
 * documents come straight from the server; the header presentation fields
 * (`riskScore`, `daysRemaining`, `nextAction`, `assignedStaff`, `outstandingRent`)
 * are derived/defaulted here — they are not modelled in the backend view.
 */
export function mapTerminationCase(
  s: ServerTerminationCase | null | undefined,
): TerminationCaseDetail {
  if (!s?.id) {
    throw new Error('Termination case response is missing the case payload')
  }

  const vacate = s.vacate ?? {
    status: LEASING_ITEM_STATUS.NOT_STARTED,
    keysReturned: false,
    keysReturnAddress: null,
    noticeEffectiveDate: null,
    expectedVacateDate: null,
    actualVacateDate: null,
    possessionRegainedDate: null,
  }
  const inspection = s.inspection ?? {
    status: LEASING_ITEM_STATUS.NOT_STARTED,
    inspectorName: null,
    inspectionDate: null,
    overallCondition: null,
    issuesFound: 0,
    tenantChargeableItems: 0,
    reportAvailable: false,
    inspectionId: null,
    ingoingInspectionId: null,
    ingoingReportUrl: null,
    outgoingReportUrl: null,
    tenantAttendance: 'pending',
  }
  const makeGood = s.makeGood ?? {
    status: LEASING_ITEM_STATUS.NOT_STARTED,
    issueCount: 0,
    tenantItems: 0,
    landlordItems: 0,
    sharedItems: 0,
    estimatedDeductions: null,
    qaComplete: false,
    maintenanceRequestId: null,
  }
  const settlement = s.settlement ?? {
    status: LEASING_ITEM_STATUS.NOT_STARTED,
    bondHeld: null,
    totalDeductions: null,
    refundAmount: null,
    debtAmount: null,
    outcome: null,
    managerApprovalRequired: false,
    managerApprovalComplete: false,
    deductions: [],
  }
  const agentApproval = s.agentApproval ?? {
    status: LEASING_ITEM_STATUS.NOT_STARTED,
    decision: TERMINATION_AGENT_DECISION.PENDING,
    evidenceComplete: false,
    proposedDeductions: null,
  }
  const tenantConfirmation = s.tenantConfirmation ?? {
    status: TENANT_SETTLEMENT_CONFIRMATION.PENDING,
    dueAt: null,
    declineReason: null,
    confirmedAt: null,
  }
  const bond = s.bond ?? {
    status: LEASING_ITEM_STATUS.NOT_STARTED,
    refundAmount: null,
    debtBalance: null,
    outcome: null,
    refundPaid: false,
    disbursementId: null,
    debtArrearsCaseId: null,
  }
  const closure = s.closure ?? {
    status: LEASING_ITEM_STATUS.NOT_STARTED,
    recommendedPropertyStatus: null,
    selectedPropertyStatus: null,
    checklistComplete: 0,
    checklistTotal: 0,
    checklistBlocking: 0,
    suggestedWeeklyRent: null,
    targetAvailableDate: null,
    releasingNotified: false,
    newLeasingCycleId: null,
  }
  const financial = s.financial ?? {
    bondHeld: null,
    totalDeductions: null,
    refundAmount: null,
    debtAmount: null,
    outcome: null,
  }

  const status = (s.status as TerminationCaseStatus) || TERMINATION_CASE_STATUS.OPEN
  return {
    id: s.id,
    caseId: s.taskNumber ?? `TRM-${s.id.slice(0, 8).toUpperCase()}`,
    status,
    propertyId: s.propertyId ?? undefined,
    property: {
      name: s.propertyAddress ?? "—",
      address: s.propertyAddress ?? "—",
    },
    tenant: {
      name: s.tenantName ?? "—",
      email: s.tenantEmail ?? undefined,
      phone: s.tenantPhone ?? undefined,
      avatarInitials: initials(s.tenantName),
    },
    terminationType: s.terminationType,
    currentStage: s.currentStage,
    slaStatus: s.slaRisk,
    riskScore: RISK_BY_SLA[s.slaRisk],
    daysRemaining: daysUntil(
      s.terminationNotice?.tenantVacateDate ??
        s.vacateDate ??
        s.terminationNotice?.terminationDate ??
        null,
    ),
    createdAt: s.createdAt,
    terminationDate:
      s.terminationType === TERMINATION_TYPE.TENANT_INITIATED
        ? undefined
        : undef(
            s.terminationNotice?.terminationDate ??
              vacate.noticeEffectiveDate ??
              s.vacateDate,
          ),
    terminationReason: s.terminationReason ?? undefined,
    leaseStartDate: s.leaseStartDate ?? undefined,
    leaseEndDate: s.leaseEndDate ?? undefined,
    bondPortalLink: s.bondPortalLink ?? null,
    cancellationReason: s.cancellationReason ?? undefined,
    cancelledAt: s.cancelledAt ?? undefined,
    cancelledBy: s.cancelledBy ?? undefined,
    vacateDate:
      s.vacateDate ??
      undef(vacate.expectedVacateDate) ??
      undef(s.terminationNotice?.tenantVacateDate) ??
      undef(s.terminationNotice?.terminationDate) ??
      null,
    initialVacateDate: s.initialVacateDate ?? undefined,
    vacateDateChanged: s.vacateDateChanged,
    vacateDateChangedAt: s.vacateDateChangedAt ?? undefined,
    vacateDateChangedBy: s.vacateDateChangedBy ?? undefined,
    agentName: s.agentName ?? undefined,
    tribunalInvolved: s.tribunalInvolved,
    assignedTeam: "Terminations",
    assignedStaff: [],
    nextAction: NEXT_ACTION_BY_STAGE[s.currentStage] ?? "Review case",

    bondHeld: n0(financial.bondHeld),
    outstandingRent: 0,
    totalDeductions: n0(financial.totalDeductions),
    refundAmount: n0(financial.refundAmount),
    debtAmount: n0(financial.debtAmount),

    documents: (s.documents ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      verified: d.verified,
      uploadedAt: d.uploadedAt,
    })),
    timeline: (s.timeline ?? []).map((e) => ({
      id: e.id,
      label: e.label,
      timestamp: e.at,
      actor: e.actor,
      kind: e.kind as TerminationActivityEvent["kind"],
    })),

    vacate: {
      status: vacate.status,
      keysReturned: vacate.keysReturned,
      keysReturnAddress: vacate.keysReturnAddress ?? undefined,
      noticeEffectiveDate: undef(vacate.noticeEffectiveDate),
      expectedVacateDate: undef(vacate.expectedVacateDate),
      actualVacateDate: undef(vacate.actualVacateDate),
      possessionRegainedDate: undef(vacate.possessionRegainedDate),
    },
    vacatingPreparation: {
      exitCleaningConfirmed: s.vacatingPreparation?.exitCleaningConfirmed ?? false,
      exitCleaningConfirmedAt: undef(s.vacatingPreparation?.exitCleaningConfirmedAt),
      exitCleaningConfirmedBy:
        (s.vacatingPreparation?.exitCleaningConfirmedBy as 'tenant' | 'agent' | undefined) ??
        undefined,
      moveOutServices:
        (s.vacatingPreparation?.moveOutServices as VacatingPreparationStageState['moveOutServices']) ??
        'pending',
      vacateDateChangeReason: s.vacatingPreparation?.vacateDateChangeReason ?? undefined,
      keyReturnPhotoUrls: s.vacatingPreparation?.keyReturnPhotoUrls ?? [],
      tenantKeyReturnSubmittedAt: undef(s.vacatingPreparation?.tenantKeyReturnSubmittedAt),
    },
    overviewEmail: s.overviewEmail?.commConversationId || s.overviewEmail?.body
      ? {
          commConversationId: s.overviewEmail.commConversationId ?? undefined,
          subject: s.overviewEmail.subject ?? undefined,
          body: s.overviewEmail.body ?? undefined,
          from: s.overviewEmail.from ?? undefined,
          to: s.overviewEmail.to ?? undefined,
          sentAt: undef(s.overviewEmail.sentAt),
        }
      : null,
    inspection: {
      status: inspection.status,
      inspectorName: undef(inspection.inspectorName),
      inspectionDate: undef(inspection.inspectionDate),
      overallCondition: undef(inspection.overallCondition),
      issuesFound: inspection.issuesFound,
      tenantChargeableItems: inspection.tenantChargeableItems,
      reportAvailable: inspection.reportAvailable,
      inspectionId: inspection.inspectionId ?? undefined,
      ingoingInspectionId: inspection.ingoingInspectionId ?? undefined,
      ingoingReportUrl: inspection.ingoingReportUrl ?? undefined,
      outgoingReportUrl: inspection.outgoingReportUrl ?? undefined,
      tenantAttendance:
        (inspection.tenantAttendance as InspectionStageState['tenantAttendance']) ?? 'pending',
    },
    reportComparison: {
      agentAcknowledged: s.reportComparison?.agentAcknowledged ?? false,
      agentAcknowledgedAt: s.reportComparison?.agentAcknowledgedAt ?? undefined,
      tenantAcknowledged: s.reportComparison?.tenantAcknowledged ?? false,
      tenantAcknowledgedAt: s.reportComparison?.tenantAcknowledgedAt ?? undefined,
      tenantResponsibility: mapRepairItems(s.reportComparison?.tenantResponsibility),
      landlordResponsibility: mapRepairItems(s.reportComparison?.landlordResponsibility),
      tenantResponsibilityStaffComment: s.reportComparison?.tenantResponsibilityStaffComment ?? null,
      tenantResponsibilityStaffCommentAt:
        s.reportComparison?.tenantResponsibilityStaffCommentAt ?? undefined,
      landlordResponsibilityStaffComment:
        s.reportComparison?.landlordResponsibilityStaffComment ?? null,
      landlordResponsibilityStaffCommentAt:
        s.reportComparison?.landlordResponsibilityStaffCommentAt ?? undefined,
      tenantResponsibilityAgentComment: s.reportComparison?.tenantResponsibilityAgentComment ?? null,
      tenantResponsibilityAgentCommentAt:
        s.reportComparison?.tenantResponsibilityAgentCommentAt ?? undefined,
      landlordResponsibilityAgentComment:
        s.reportComparison?.landlordResponsibilityAgentComment ?? null,
      landlordResponsibilityAgentCommentAt:
        s.reportComparison?.landlordResponsibilityAgentCommentAt ?? undefined,
      tenantResponsibilityAgentAcknowledged:
        s.reportComparison?.tenantResponsibilityAgentAcknowledged ?? null,
      tenantResponsibilityAgentAcknowledgedAt:
        s.reportComparison?.tenantResponsibilityAgentAcknowledgedAt ?? undefined,
      landlordResponsibilityAgentAcknowledged:
        s.reportComparison?.landlordResponsibilityAgentAcknowledged ?? null,
      landlordResponsibilityAgentAcknowledgedAt:
        s.reportComparison?.landlordResponsibilityAgentAcknowledgedAt ?? undefined,
      tenantResponsibilityReviewStatus:
        (s.reportComparison?.tenantResponsibilityReviewStatus as
          | 'none'
          | 'pending'
          | 'accepted'
          | 'declined'
          | undefined) ?? 'none',
      tenantResponsibilityReviewAt: s.reportComparison?.tenantResponsibilityReviewAt ?? undefined,
      tenantResponsibilityDeclineReason:
        s.reportComparison?.tenantResponsibilityDeclineReason ?? undefined,
      draftSummaryEmail: mapOverviewEmail(s.reportComparison?.draftSummaryEmail),
      tenantComparisonSummaryEmail: mapOverviewEmail(s.reportComparison?.tenantComparisonSummaryEmail),
      agentComparisonSummaryEmail: mapOverviewEmail(s.reportComparison?.agentComparisonSummaryEmail),
      landlordComparisonSummaryEmail: mapOverviewEmail(
        s.reportComparison?.landlordComparisonSummaryEmail,
      ),
      staffCommentsToAgentEmail: mapOverviewEmail(s.reportComparison?.staffCommentsToAgentEmail),
      landlordPropertyUpdateEmail: mapOverviewEmail(
        s.reportComparison?.landlordPropertyUpdateEmail,
      ),
      tenantRepairQuoteEmail: mapOverviewEmail(s.reportComparison?.tenantRepairQuoteEmail),
      landlordRepairQuoteEmail: mapOverviewEmail(s.reportComparison?.landlordRepairQuoteEmail),
      agentRepairQuoteEmail: mapOverviewEmail(s.reportComparison?.agentRepairQuoteEmail),
      agentQuoteConfirmed: s.reportComparison?.agentQuoteConfirmed ?? false,
      agentQuoteConfirmedAt: s.reportComparison?.agentQuoteConfirmedAt ?? undefined,
      tenantQuoteResponse: s.reportComparison?.tenantQuoteResponse ?? null,
      tenantQuoteResponseAt: s.reportComparison?.tenantQuoteResponseAt ?? undefined,
      tenantQuoteDeclineReason: s.reportComparison?.tenantQuoteDeclineReason ?? undefined,
      tenantAcknowledgedPrice: s.reportComparison?.tenantAcknowledgedPrice ?? undefined,
      tenantQuoteReplyExcerpt: s.reportComparison?.tenantQuoteReplyExcerpt ?? undefined,
      settlementSummary: s.reportComparison?.settlementSummary ?? null,
      tenantBondSummaryEmail: mapOverviewEmail(s.reportComparison?.tenantBondSummaryEmail),
      landlordBondSummaryEmail: mapOverviewEmail(s.reportComparison?.landlordBondSummaryEmail),
    },
    makeGood: {
      status: makeGood.status,
      issueCount: makeGood.issueCount,
      tenantItems: makeGood.tenantItems,
      landlordItems: makeGood.landlordItems,
      sharedItems: makeGood.sharedItems,
      estimatedDeductions: n0(makeGood.estimatedDeductions),
      qaComplete: makeGood.qaComplete,
      maintenanceRequestId: makeGood.maintenanceRequestId ?? undefined,
    },
    settlement: {
      status: settlement.status,
      bondHeld: n0(settlement.bondHeld),
      totalDeductions: n0(settlement.totalDeductions),
      refundAmount: n0(settlement.refundAmount),
      debtAmount: n0(settlement.debtAmount),
      outcome: settlement.outcome ?? TERMINATION_OUTCOME.REFUND,
      managerApprovalRequired: settlement.managerApprovalRequired,
      managerApprovalComplete: settlement.managerApprovalComplete,
      deductions: (settlement.deductions ?? []).map((d) => ({
        id: d.id,
        category: d.category,
        description: d.description ?? "",
        amount: d.amount,
        responsibility: d.responsibility,
      })),
    },
    agentApproval: {
      status: agentApproval.status,
      decision: agentApproval.decision,
      evidenceComplete: agentApproval.evidenceComplete,
      proposedDeductions: agentApproval.proposedDeductions ?? undefined,
    },
    tenantConfirmation: {
      status: tenantConfirmation.status,
      dueAt: undef(tenantConfirmation.dueAt),
      declineReason: tenantConfirmation.declineReason ?? undefined,
      confirmedAt: undef(tenantConfirmation.confirmedAt),
    },
    terminationNotice: s.terminationNotice
      ? {
          ground: s.terminationNotice.ground,
          groundLabel: s.terminationNotice.groundLabel,
          terminationDate: s.terminationNotice.terminationDate,
          noticeEmailSentAt: s.terminationNotice.noticeEmailSentAt,
          tenantVacateDate: s.terminationNotice.tenantVacateDate,
          tenantVacateDateProvidedAt: s.terminationNotice.tenantVacateDateProvidedAt,
          breachClause: s.terminationNotice.breachClause,
          breachConduct: s.terminationNotice.breachConduct,
          noticePeriodDays: s.terminationNotice.noticePeriodDays,
          emailVariant: s.terminationNotice.emailVariant,
          emailSent: s.terminationNotice.emailSent,
        }
      : null,
    bond: {
      status: bond.status,
      refundAmount: n0(bond.refundAmount),
      debtBalance: n0(bond.debtBalance),
      outcome: bond.outcome ?? TERMINATION_OUTCOME.REFUND,
      refundPaid: bond.refundPaid,
      readiness: bondReadiness(s),
    },
    closure: {
      status: closure.status,
      recommendedPropertyStatus:
        closure.recommendedPropertyStatus ?? PROPERTY_RECOVERY_STATUS.AWAITING_INSPECTION,
      selectedPropertyStatus: closure.selectedPropertyStatus,
      checklistComplete: closure.checklistComplete,
      checklistTotal: closure.checklistTotal,
      checklistBlocking: closure.checklistBlocking,
      suggestedWeeklyRent: closure.suggestedWeeklyRent ?? undefined,
      targetAvailableDate: undef(closure.targetAvailableDate),
      releasingNotified: closure.releasingNotified,
    },
  }
}

type ListParams = {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  stage?: string
  propertyId?: string
}

const unwrap = (
  p: Promise<{ case?: ServerTerminationCase | null }>,
): Promise<TerminationCaseDetail> => p.then((r) => mapTerminationCase(r?.case))

/**
 * Typed wrapper over the backend End-Leasing termination workflow
 * (`/api/end-leasing/cases/*`). Auth cookies + 401 refresh ride `lib/api.ts`;
 * row scoping is server-side. Every transition echoes the full updated case, so
 * the store updates in place without a reload.
 */
export const terminationApi = {
  list: (params: ListParams = {}): Promise<TerminationListResult> =>
    api.get<TerminationListResult>(`/end-leasing/cases${qs(params)}`),

  create: (input: CreateTerminationCaseInput): Promise<TerminationCaseDetail> =>
    unwrap(api.post<{ case: ServerTerminationCase }>("/end-leasing/cases", input)),

  previewTerminationNotice: (params: {
    propertyId: string
    terminationGround: string
    proposedTerminationDate?: string
    breachClause?: string
    breachConduct?: string
  }): Promise<Blob> => {
    const q = qs(params)
    return api.getBlob(`/end-leasing/cases/preview/notice-to-terminate.pdf${q}`)
  },

  downloadTerminationNotice: (caseId: string): Promise<Blob> =>
    api.getBlob(`/end-leasing/cases/${caseId}/notice-to-terminate.pdf`),

  sendTerminationNotice: (caseId: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.post<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${caseId}/send-termination-notice`,
        {},
      ),
    ),

  get: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(api.get<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}`)),

  confirmKeyReturn: (id: string, input?: { date?: string; keysReceived?: boolean }): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/vacate/confirm-keys`, input ?? {}),
    ),

  setKeyReturn: (
    id: string,
    input: { date?: string; keysReceived?: boolean; returnAddress?: string },
  ): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/vacate/confirm-keys`, input),
    ),

  setKeysReturnAddress: (id: string, returnAddress: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/vacate/confirm-keys`, {
        returnAddress,
      }),
    ),

  updateVacatingPreparation: (
    id: string,
    input: {
      exitCleaningConfirmed?: boolean;
      moveOutServices?: VacatingPreparationStageState['moveOutServices'];
      tenantOutgoingAttendance?: 'yes' | 'no';
    },
  ): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/vacate/preparation`, input),
    ),

  setTenantOutgoingAttendance: (
    id: string,
    attendance: 'yes' | 'no',
  ): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/inspection/tenant-attendance`,
        { attendance },
      ),
    ),

  scheduleInspection: (
    id: string,
    input: ScheduleInspectionInput,
  ): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/inspection/schedule`, input)),

  completeInspection: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/inspection/complete`, {})),

  updateReportComparison: (
    id: string,
    input: UpdateReportComparisonInput,
  ): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/report-comparison`,
        input,
      ),
    ),

  sendRepairQuoteEmail: (
    id: string,
    audience: RepairQuoteEmailAudience,
  ): Promise<TerminationCaseDetail> =>
    unwrap(
      api.post<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/report-comparison/send-quote-email`,
        { audience },
      ),
    ),

  sendComparisonSummaryEmail: (
    id: string,
    audience: ComparisonSummaryEmailAudience,
  ): Promise<TerminationCaseDetail> =>
    unwrap(
      api.post<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/report-comparison/send-comparison-summary`,
        { audience },
      ),
    ),

  confirmAgentQuote: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/report-comparison/confirm-agent-quote`,
        {},
      ),
    ),

  acceptTenantRepairQuote: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/report-comparison/tenant-quote/accept`,
        {},
      ),
    ),

  declineTenantRepairQuote: (
    id: string,
    input?: { reason?: string; acknowledgedPrice?: string },
  ): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/report-comparison/tenant-quote/decline`,
        input ?? {},
      ),
    ),

  syncTenantQuoteResponse: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.post<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/report-comparison/sync-tenant-quote-response`,
        {},
      ),
    ),

  updateMakeGood: (
    id: string,
    input: UpdateMakeGoodInput,
  ): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/make-good/update`, input)),

  completeMakeGood: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/make-good/complete`, {})),

  spawnMakeGoodMaintenance: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/make-good/spawn-maintenance`,
        {},
      ),
    ),

  skipMaintenance: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/make-good/skip`, {})),

  finalizeSettlement: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/settlement/finalize`, {})),

  agentApprove: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/agent-approval/approve`, {})),

  agentReject: (id: string, proposedDeductions: number): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/agent-approval/reject`, {
        proposedDeductions,
      }),
    ),

  tenantAcceptSettlement: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/tenant-confirmation/accept`,
        {},
      ),
    ),

  tenantDeclineSettlement: (id: string, reason: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(
        `/end-leasing/cases/${id}/tenant-confirmation/decline`,
        { reason },
      ),
    ),

  processBondRefund: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/bond/refund`, {})),

  cancel: (id: string, reason?: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/cancel`, {
        reason,
      }),
    ),

  updateVacateDate: (id: string, date: string, reason: string): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/vacate/date`, {
        date: new Date(date).toISOString(),
        reason: reason.trim(),
      }),
    ),
}
