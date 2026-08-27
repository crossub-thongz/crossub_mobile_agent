/**
 * Server-side shapes for the Leasing live-ops cycle backend
 * (`/api/leasing/cycles`). Distinct from `lib/leasing-types.ts` (the Records
 * read path). Prisma serialises Decimal → number and Date → ISO string over
 * JSON; the workflow enums arrive lowercased to match the FE `constants/leasing`
 * unions. The rich `LeasingPropertyDetail` the dashboard renders is mapped from
 * `ServerLeasingCycleView` (see `leasing-ops-api.ts`), deriving/defaulting the
 * card-presentation + applicant richness the backend view doesn't carry.
 */

export interface ServerLeasingCycleSummary {
  id: string
  propertyId: string
  propertyAddress: string | null
  cycle: number
  isActive: boolean
  cancelledAt?: string | null
  cancelReason?: string | null
  lifecycleStep: string
  activeStepHint: string | null
  /** Server-derived SLA tier (on_track | due_soon | overdue | escalated) from the daily sweep. */
  slaRisk: string
  agentName: string | null
  rentPerWeek: number | null
  openInspectionStatus: string
  openReportStatus: string
  createdAt: string
  updatedAt: string
}

export interface ServerLeasingApplicationReview {
  id: string
  applicationId: string
  applicantName: string | null
  applicantEmail: string | null
  applicantPhone: string | null
  applicationStatus: string | null
  selectedForAgent: boolean
  sentToAgent: boolean
  sentToAgentAt: string | null
  aiAdviceSentToAgent: boolean
  aiScore: number | null
  aiScoreLevel: string | null
  aiAdvice: string | null
  agentFeedback: string | null
  feedbackSentAt: string | null
  annualIncome: number | null
  employmentStatus: string | null
  moveInDate: string | null
  submittedAt: string | null
  agentDecision: string
  decisionAt: string | null
  documents: string[]
}

/** CROSSUB review personnel for a cycle (the agency's assigned account managers). */
export interface ServerLeasingReviewStaff {
  name: string
  initials: string
  role: string
}

export interface ServerLeasingOnboarding {
  deposit: {
    status: string
    amount: number | null
    paidAt: string | null
    proofFileName: string | null
    proofUrl: string | null
    ledgerEntryId: string | null
  }
  bond: {
    status: string
    amount: number | null
    agentLink: string | null
    sentToTenantAt: string | null
    paidAt: string | null
    proofFileName: string | null
    proofUrl: string | null
    ledgerEntryId: string | null
    lodgementRef: string | null
  }
  agreement: {
    status: string
    confirmed: boolean
    uploadedFileName: string | null
    signedProofUrl: string | null
    signedProofFileName: string | null
    signingStatus: string
    signedAt: string | null
    contractDraft: ServerContractDraft | null
  }
  keyCollection: {
    status: string
    time: string | null
    timeEnd: string | null
    location: string | null
    photos: string[]
    tenantReport: {
      submittedAt: string | null
      tagNumber: string | null
      keysCount: number | null
      entryDoorCount: number | null
      windowSlidingCount: number | null
      fobsCount: number | null
      remoteControlCount: number | null
      mailboxCount: number | null
      othersCount: number | null
    } | null
  }
  ingoingInspection: {
    status: string
    scheduledTime: string | null
    assignee: string | null
    inspectionId: string | null
    tenantConfirmed: boolean
  }
  ingoingReportApproval: {
    status: string
    tenantApproved: boolean
    approvedAt: string | null
  }
}

/** The free-form contract Json the backend accumulates across contract writes. */
export interface ServerContractDraft {
  template?: string
  leaseTerm?: string
  tenantMovedOut?: boolean
  tenantMovedOutDate?: string
  lettingNotes?: string
  startDate?: string
  endDate?: string
  weeklyRent?: number
  bond?: number
  deposit?: number
  paymentReference?: string
  eftBsb?: string
  eftAccountNumber?: string
  eftAccountName?: string
  jointTenants?: { name: string; email?: string; phone?: string }[]
  petsAllowed?: boolean
  petsNotes?: string
  waterChargedSeparately?: boolean
  specialConditions?: { text: string }[]
  confirmed?: boolean
}

export interface ServerLeasingDispute {
  id: string
  area: string | null
  description: string | null
  raisedAt: string
  routedToMaintenance: boolean
  maintenanceRequestId: string | null
}

export interface ServerLeasingTimelineEvent {
  id: string
  label: string
  kind: string
  actor: string
  at: string
}

export interface ServerLeasingCycleView extends ServerLeasingCycleSummary {
  agent: {
    name: string | null
    company: string | null
    email: string | null
    phone: string | null
    keyCustody: string
  }
  reviewStaff: ServerLeasingReviewStaff[]
  rental: {
    rentPerWeek: number | null
    availableFrom: string | null
    moveInDate: string | null
    deposit: number | null
    bond: number | null
  }
  openInspection: {
    status: string
    required: boolean
    inspectionId?: string | null
    inspectorName: string | null
    previousInspectorName?: string | null
    inspectorPhone?: string | null
    inspectorEmail?: string | null
    /**
     * ⚠️ Non-null even when nothing is scheduled — a property waiting in the weekly open
     * pool carries a PLACEHOLDER here, because the viewing record's start cannot be null.
     * Read it with `timeProvisional`, never alone.
     */
    scheduledTime: string | null
    scheduledTimeEnd?: string | null
    /** TRUE while `scheduledTime` is a placeholder rather than a confirmed open time. */
    timeProvisional?: boolean
    /** When the inspector confirmed the open time. Absent while provisional. */
    timeConfirmedAt?: string | null
    /** `YYYY-MM-DD` of the batch Wednesday this request belongs to. */
    batchWeekKey?: string | null
    /** What the agent asked for — weighed by the inspector's route, never binding. */
    agentPreferredStart?: string | null
    /** Position in the assigned inspector's Saturday route (1-based). */
    routeSequence?: number | null
    preferredScheduledTime?: string | null
    preferredScheduledTimeEnd?: string | null
    preferredNotes?: string | null
    startedEarly?: boolean
    startedEarlyAt?: string | null
    originalScheduledStart?: string | null
    finishedAt?: string | null
    pushedToAgentApp: boolean
    agentConducted: boolean
    agentNotifiedToAdvertise: boolean
    advertising: string
    advertisingNote: string | null
  }
  openReport: {
    status: string
    sentToAgent: boolean
    sentToAgentAt: string | null
    viewerInvitesSent: boolean
    invitedCount: number | null
    applyPaths: string[]
    reportViewable: boolean
    attendeeCount: number | null
    viewerInvites: ServerLeasingViewerInvite[]
  }
  applications: ServerLeasingApplicationReview[]
  onboarding: ServerLeasingOnboarding | null
  disputes: ServerLeasingDispute[]
  viewingSessionId: string | null
  tenancyAgreementId: string | null
  timeline: ServerLeasingTimelineEvent[]
  applicationScreeningSkipped: boolean
}

export interface ServerLeasingViewerInvite {
  id: string
  email: string | null
  phone: string | null
  channel: "email" | "sms"
  body: string
  sentAt: string
  commConversationId: string | null
}

export interface LeasingCycleListResult {
  cycles: ServerLeasingCycleSummary[]
  total: number
}

// --- transition inputs (mirror the backend DTOs) ---

/** Open a new leasing cycle for a property (mirrors the backend CreateLeasingCycleDto). */
export interface CreateLeasingCycleInput {
  propertyId: string
  agentName?: string
  agentCompany?: string
  agentEmail?: string
  agentPhone?: string
  keyCustody?: "crossub" | "agent"
  rentPerWeek: number
  availableFrom: string
  deposit?: number
  bond?: number
  /** When true, skip step 1 (open inspection) on create. */
  skipOpenInspection?: boolean
}

export interface SendViewerInvitesInput {
  recipients: Array<{ email?: string; phone?: string }>
}

export interface ArrangeOpenInspectionInput {
  scheduledTime: string
}

export interface SetApplicantDecisionInput {
  decision: "approved" | "rejected"
}

export interface CreateManualApplicantInput {
  name: string
  email?: string
  phone?: string
}

export interface UploadApplicantDocumentInput {
  fileName: string
  mimeType: string
  sizeBytes: number
  contentBase64: string
}

export interface SetBondLinkInput {
  link: string
}

export interface UpdateContractInput {
  template?: string
  leaseTerm?: string
  startDate?: string
  endDate?: string
  weeklyRent?: number
  bond?: number
  deposit?: number
  paymentReference?: string
  eftBsb?: string
  eftAccountNumber?: string
  eftAccountName?: string
  jointTenants?: { name: string; email?: string; phone?: string }[]
  petsAllowed?: boolean
  petsNotes?: string
  waterChargedSeparately?: boolean
}

export interface AddContractConditionInput {
  text: string
}

export interface UploadContractInput {
  fileName: string
}

export interface SetKeyCollectionInput {
  time: string
  location: string
}

export interface ScheduleIngoingInput {
  scheduledTime: string
  assignee: string
  inspectorId?: string
}

export interface AddDisputeInput {
  area?: string
  description: string
}

/** Agent-cancelled letting — not a completed onboarding case. */
export function isWithdrawnServerLeasingCycle(view: {
  isActive: boolean
  cancelReason?: string | null
  cancelledAt?: string | Date | null
}): boolean {
  return Boolean(view.cancelReason?.toString().trim() || view.cancelledAt)
}
