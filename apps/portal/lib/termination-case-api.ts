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
} from '@/lib/termination-case-types';
import type {
  BondStageState,
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

/** Derive the bond readiness checklist the FE renders (not modelled server-side). */
function bondReadiness(s: ServerTerminationCase): BondStageState["readiness"] {
  const agentReviewed =
    s.agentApproval.decision === TERMINATION_AGENT_DECISION.APPROVED ||
    s.agentApproval.decision === TERMINATION_AGENT_DECISION.ADJUSTMENT
  return [
    { label: "Settlement finalised", done: s.settlement.status === LEASING_ITEM_STATUS.DONE },
    { label: "Agent reviewed", done: agentReviewed },
    {
      label: "Tenant confirmed",
      done: s.tenantConfirmation.status === TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED,
    },
    { label: "Refund paid", done: s.bond.refundPaid },
  ]
}

/**
 * Map a lean server termination case → the rich `TerminationCaseDetail` the
 * components consume. The 7-stage sub-states, financials, deductions, timeline and
 * documents come straight from the server; the header presentation fields
 * (`riskScore`, `daysRemaining`, `nextAction`, `assignedStaff`, `outstandingRent`)
 * are derived/defaulted here — they are not modelled in the backend view.
 */
export function mapTerminationCase(s: ServerTerminationCase): TerminationCaseDetail {
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
        : undef(s.terminationNotice?.terminationDate ?? s.vacate.noticeEffectiveDate ?? s.vacateDate),
    terminationReason: s.terminationReason ?? undefined,
    bondPortalLink: s.bondPortalLink ?? null,
    cancellationReason: s.cancellationReason ?? undefined,
    cancelledAt: s.cancelledAt ?? undefined,
    cancelledBy: s.cancelledBy ?? undefined,
    vacateDate: s.vacateDate,
    initialVacateDate: s.initialVacateDate ?? undefined,
    vacateDateChanged: s.vacateDateChanged,
    vacateDateChangedAt: s.vacateDateChangedAt ?? undefined,
    vacateDateChangedBy: s.vacateDateChangedBy ?? undefined,
    agentName: s.agentName ?? undefined,
    tribunalInvolved: s.tribunalInvolved,
    assignedTeam: "Terminations",
    assignedStaff: [],
    nextAction: NEXT_ACTION_BY_STAGE[s.currentStage] ?? "Review case",

    bondHeld: n0(s.financial.bondHeld),
    outstandingRent: 0,
    totalDeductions: n0(s.financial.totalDeductions),
    refundAmount: n0(s.financial.refundAmount),
    debtAmount: n0(s.financial.debtAmount),

    documents: s.documents.map((d) => ({
      id: d.id,
      name: d.name,
      verified: d.verified,
      uploadedAt: d.uploadedAt,
    })),
    timeline: s.timeline.map((e) => ({
      id: e.id,
      label: e.label,
      timestamp: e.at,
      actor: e.actor,
      kind: e.kind as TerminationActivityEvent["kind"],
    })),

    vacate: {
      status: s.vacate.status,
      keysReturned: s.vacate.keysReturned,
      noticeEffectiveDate: undef(s.vacate.noticeEffectiveDate),
      expectedVacateDate: undef(s.vacate.expectedVacateDate),
      actualVacateDate: undef(s.vacate.actualVacateDate),
      possessionRegainedDate: undef(s.vacate.possessionRegainedDate),
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
    },
    inspection: {
      status: s.inspection.status,
      inspectorName: undef(s.inspection.inspectorName),
      inspectionDate: undef(s.inspection.inspectionDate),
      overallCondition: undef(s.inspection.overallCondition),
      issuesFound: s.inspection.issuesFound,
      tenantChargeableItems: s.inspection.tenantChargeableItems,
      reportAvailable: s.inspection.reportAvailable,
      inspectionId: s.inspection.inspectionId ?? undefined,
    },
    makeGood: {
      status: s.makeGood.status,
      issueCount: s.makeGood.issueCount,
      tenantItems: s.makeGood.tenantItems,
      landlordItems: s.makeGood.landlordItems,
      sharedItems: s.makeGood.sharedItems,
      estimatedDeductions: n0(s.makeGood.estimatedDeductions),
      qaComplete: s.makeGood.qaComplete,
      maintenanceRequestId: s.makeGood.maintenanceRequestId ?? undefined,
    },
    settlement: {
      status: s.settlement.status,
      bondHeld: n0(s.settlement.bondHeld),
      totalDeductions: n0(s.settlement.totalDeductions),
      refundAmount: n0(s.settlement.refundAmount),
      debtAmount: n0(s.settlement.debtAmount),
      outcome: s.settlement.outcome ?? TERMINATION_OUTCOME.REFUND,
      managerApprovalRequired: s.settlement.managerApprovalRequired,
      managerApprovalComplete: s.settlement.managerApprovalComplete,
      deductions: s.settlement.deductions.map((d) => ({
        id: d.id,
        category: d.category,
        description: d.description ?? "",
        amount: d.amount,
        responsibility: d.responsibility,
      })),
    },
    agentApproval: {
      status: s.agentApproval.status,
      decision: s.agentApproval.decision,
      evidenceComplete: s.agentApproval.evidenceComplete,
      proposedDeductions: s.agentApproval.proposedDeductions ?? undefined,
    },
    tenantConfirmation: {
      status: s.tenantConfirmation.status,
      dueAt: undef(s.tenantConfirmation.dueAt),
      declineReason: s.tenantConfirmation.declineReason ?? undefined,
      confirmedAt: undef(s.tenantConfirmation.confirmedAt),
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
      status: s.bond.status,
      refundAmount: n0(s.bond.refundAmount),
      debtBalance: n0(s.bond.debtBalance),
      outcome: s.bond.outcome ?? TERMINATION_OUTCOME.REFUND,
      refundPaid: s.bond.refundPaid,
      readiness: bondReadiness(s),
    },
    closure: {
      status: s.closure.status,
      recommendedPropertyStatus:
        s.closure.recommendedPropertyStatus ?? PROPERTY_RECOVERY_STATUS.AWAITING_INSPECTION,
      selectedPropertyStatus: s.closure.selectedPropertyStatus,
      checklistComplete: s.closure.checklistComplete,
      checklistTotal: s.closure.checklistTotal,
      checklistBlocking: s.closure.checklistBlocking,
      suggestedWeeklyRent: s.closure.suggestedWeeklyRent ?? undefined,
      targetAvailableDate: undef(s.closure.targetAvailableDate),
      releasingNotified: s.closure.releasingNotified,
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
  p: Promise<{ case: ServerTerminationCase }>,
): Promise<TerminationCaseDetail> => p.then((r) => mapTerminationCase(r.case))

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
    input: { date: string; keysReceived?: boolean },
  ): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/vacate/confirm-keys`, input),
    ),

  updateVacatingPreparation: (
    id: string,
    input: {
      exitCleaningConfirmed?: boolean;
      moveOutServices?: VacatingPreparationStageState['moveOutServices'];
    },
  ): Promise<TerminationCaseDetail> =>
    unwrap(
      api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/vacate/preparation`, input),
    ),

  scheduleInspection: (
    id: string,
    input: ScheduleInspectionInput,
  ): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/inspection/schedule`, input)),

  completeInspection: (id: string): Promise<TerminationCaseDetail> =>
    unwrap(api.patch<{ case: ServerTerminationCase }>(`/end-leasing/cases/${id}/inspection/complete`, {})),

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
