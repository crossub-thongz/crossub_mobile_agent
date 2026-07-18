import type {
  InterestLevel,
  OpenInspectionSession,
  SessionCycle,
  SessionStatus,
} from "@/constants/open-inspection-ops"

import { api } from "./api"

const BASE = "/open-viewings"

/** Mutations echo back the full session view, already in the FE OpenInspectionSession shape. */
const unwrap = async (
  p: Promise<{ session: OpenInspectionSession }>,
): Promise<OpenInspectionSession> => (await p).session

export interface ViewingDecisionInput {
  decision: "approved" | "rejected"
  rejectReason?: string
  feedback?: string
}

export interface CreateWalkInInput {
  name?: string
  email?: string
  phone?: string
  interestLevel?: InterestLevel
  personId?: string
  viewingRequestId?: string
}

export interface CreateViewingSessionInput {
  propertyId: string
  startTime: string
  endTime?: string
  cycle?: SessionCycle
  shortNote?: string
  agentId?: string
  agentName?: string
  agentRole?: "leasing_agent" | "property_manager" | "ops_coordinator"
  agentPhone?: string
  /** Standalone open inspection — whether the current tenant has vacated. */
  tenantMovedOut?: boolean
  /** Standalone open inspection — preferred weekly rent (AUD). */
  preferredRentPerWeek?: number
  /** Standalone open inspection — e.g. "52 weeks". */
  preferredLeaseTerm?: string
  /** Standalone open inspection — earliest availability date (YYYY-MM-DD). */
  preferredAvailableFrom?: string
}

export interface ViewingKpiSummary {
  sessions: number
  visitors: number
  attended: number
  applications: number
  pendingReview: number
  qrPreRegistered: number
}

/**
 * Typed client over the Open Viewings backend (`/api/open-viewings`). The server
 * view IS the FE OpenInspectionSession shape, so reads/mutations drop straight into
 * the dashboard with no extra mapping. Mutations echo back the full session.
 */
export const openViewingsApi = {
  async list(params?: {
    sessionStatus?: SessionStatus
    pageSize?: number
    propertyId?: string
  }): Promise<OpenInspectionSession[]> {
    const sp = new URLSearchParams()
    sp.set("pageSize", String(params?.pageSize ?? 100))
    if (params?.sessionStatus) sp.set("sessionStatus", params.sessionStatus)
    if (params?.propertyId) sp.set("propertyId", params.propertyId)
    const r = await api.get<{ sessions: OpenInspectionSession[]; total: number }>(
      `${BASE}/sessions?${sp.toString()}`,
    )
    return r.sessions
  },

  async summary(): Promise<ViewingKpiSummary> {
    const r = await api.get<{ summary: ViewingKpiSummary }>(`${BASE}/summary`)
    return r.summary
  },

  get: (id: string) =>
    unwrap(api.get<{ session: OpenInspectionSession }>(`${BASE}/sessions/${id}`)),

  // Session lifecycle
  create: (input: CreateViewingSessionInput) =>
    unwrap(api.post<{ session: OpenInspectionSession }>(`${BASE}/sessions`, input)),
  enRoute: (id: string) =>
    unwrap(api.patch<{ session: OpenInspectionSession }>(`${BASE}/sessions/${id}/en-route`, {})),
  open: (id: string) =>
    unwrap(api.patch<{ session: OpenInspectionSession }>(`${BASE}/sessions/${id}/open`, {})),
  close: (id: string) =>
    unwrap(api.patch<{ session: OpenInspectionSession }>(`${BASE}/sessions/${id}/close`, {})),
  cancel: (id: string, reason?: string, options?: { force?: boolean }) =>
    unwrap(
      api.patch<{ session: OpenInspectionSession }>(`${BASE}/sessions/${id}/cancel`, {
        reason,
        force: options?.force === true,
      }),
    ),

  // Attendance
  addWalkIn: (sessionId: string, input: CreateWalkInInput) =>
    unwrap(api.post<{ session: OpenInspectionSession }>(`${BASE}/sessions/${sessionId}/attendees`, input)),
  setAttendance: (attendeeId: string, status: "attended" | "no_show") =>
    unwrap(api.patch<{ session: OpenInspectionSession }>(`${BASE}/attendees/${attendeeId}/attendance`, { status })),
  setInterest: (attendeeId: string, interestLevel: InterestLevel) =>
    unwrap(api.patch<{ session: OpenInspectionSession }>(`${BASE}/attendees/${attendeeId}/interest`, { interestLevel })),

  // Follow-up
  advanceFollowUp: (attendeeId: string) =>
    unwrap(api.patch<{ session: OpenInspectionSession }>(`${BASE}/attendees/${attendeeId}/advance-follow-up`, {})),
  setFollowUpNote: (attendeeId: string, note: string) =>
    unwrap(api.patch<{ session: OpenInspectionSession }>(`${BASE}/attendees/${attendeeId}/follow-up-note`, { note })),

  // Application (link an existing leasing Application, then decide)
  linkApplication: (attendeeId: string, applicationId: string) =>
    unwrap(api.patch<{ session: OpenInspectionSession }>(`${BASE}/attendees/${attendeeId}/link-application`, { applicationId })),
  decide: (attendeeId: string, input: ViewingDecisionInput) =>
    unwrap(api.patch<{ session: OpenInspectionSession }>(`${BASE}/attendees/${attendeeId}/decision`, input)),

  sendApplyLink: async (sessionId: string, emails: string[]) =>
    api.post<{ ok: true; sent: number; session: OpenInspectionSession }>(
      `${BASE}/sessions/${sessionId}/send-apply-link`,
      { emails },
    ),

  sendReportToLandlord: async (sessionId: string, email?: string) =>
    api.post<{ ok: true; session: OpenInspectionSession }>(
      `${BASE}/sessions/${sessionId}/send-report-to-landlord`,
      { ...(email ? { email } : {}) },
    ),

  generateReport: (sessionId: string) =>
    unwrap(api.post<{ session: OpenInspectionSession }>(`${BASE}/sessions/${sessionId}/generate-report`, {})),

  completeReview: (sessionId: string) =>
    unwrap(api.post<{ session: OpenInspectionSession }>(`${BASE}/sessions/${sessionId}/complete-review`, {})),

  downloadReportPdf: (sessionId: string): Promise<Blob> =>
    api.getBlob(`${BASE}/sessions/${sessionId}/report.pdf`),

  /** Authenticated PDF URL — must include `/api` so the BFF proxy handles the request. */
  reportPdfUrl: (sessionId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api"
    return `${apiUrl}${BASE}/sessions/${sessionId}/report.pdf`
  },
}
