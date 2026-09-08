import type { components } from '@crossub-thongz/api-contract';

import { ApiError, api } from '@/lib/api';
import type { MaintenanceCloseReason } from '@/constants/maintenance-close';
import type {
  ApiMaintenanceState,
  ApiMaintenanceUserRole,
  ApiQuotation,
} from '@/lib/crossub-api/types';

import { crossub } from './client';

/**
 * Contract-derived shapes for the `/api/v1/agent/maintenance/*` facade — the agent's own lane
 * for the decisions it makes on a job (approve / reject / price review / close) and the read of
 * the V2 spine that rides on the job detail (quote versions, work order, invoice match, urgent
 * authorisations). Never hand-rolled: the whole point of the facade is that the agent stops
 * borrowing the staff `/maintenance/*` endpoints for these.
 */
export type AgentMaintenanceCard = components['schemas']['AgentMaintenanceDto'];
export type AgentMaintenanceDetail = components['schemas']['AgentMaintenanceDetailDto'];
export type AgentMaintenanceQuoteVersion =
  components['schemas']['AgentMaintenanceQuoteVersionDto'];
export type AgentMaintenanceWorkOrder = components['schemas']['AgentMaintenanceWorkOrderDto'];
export type AgentMaintenanceInvoiceMatch =
  components['schemas']['AgentMaintenanceInvoiceMatchDto'];
export type AgentMaintenanceUrgentAuthorisation =
  components['schemas']['AgentMaintenanceUrgentAuthorisationDto'];

/**
 * openapi-fetch resolves rather than throws — but the app's callers (and the close dialog's 409
 * "commitments" flow in particular) expect a thrown `ApiError` carrying the server's message.
 * Re-raise so the existing try/catch + message parsing keeps working unchanged.
 */
function unwrapAgentMaintenance<T>(
  result: { data?: T; error?: unknown; response: Response },
  fallback: string,
): T {
  if (result.error !== undefined || result.data === undefined) {
    throw new ApiError(result.response?.status ?? 500, result.error ?? fallback);
  }
  return result.data;
}

export type MaintenanceWorkflowResponsibility = 'tenant' | 'landlord' | 'strata';

export type MaintenanceWorkflowStatus =
  | 'under_review'
  | 'pending_evidence'
  | 'pending_quotation'
  | 'pending_approval'
  | 'pending_schedule'
  | 'in_progress'
  | 'completed'
  | 'closed';

const AGENT_ROLE: ApiMaintenanceUserRole = 'agent';

export async function fetchMaintenanceState(): Promise<ApiMaintenanceState> {
  return api.get<ApiMaintenanceState>('/maintenance/state');
}

export async function fetchMaintenanceRequest(
  requestId: string,
): Promise<{
  request: ApiMaintenanceState['maintenanceRequests'][number];
  quotations: ApiMaintenanceState['quotations'];
  maintenanceReminders: ApiMaintenanceState['maintenanceReminders'];
  maintenanceAttachments: NonNullable<ApiMaintenanceState['maintenanceAttachments']>;
  maintenanceAuditLog: ApiMaintenanceState['maintenanceAuditLog'];
  maintenanceNotifications: ApiMaintenanceState['maintenanceNotifications'];
}> {
  const payload = await api.get<{
    request: ApiMaintenanceState['maintenanceRequests'][number];
    quotations?: ApiMaintenanceState['quotations'];
    maintenanceReminders?: ApiMaintenanceState['maintenanceReminders'];
    maintenanceAttachments?: ApiMaintenanceState['maintenanceAttachments'];
    maintenanceAuditLog?: ApiMaintenanceState['maintenanceAuditLog'];
    maintenanceNotifications?: ApiMaintenanceState['maintenanceNotifications'];
  }>(`/maintenance/requests/${requestId}`);
  return {
    request: payload.request,
    quotations: payload.quotations ?? [],
    maintenanceReminders: payload.maintenanceReminders ?? [],
    maintenanceAttachments: payload.maintenanceAttachments ?? [],
    maintenanceAuditLog: payload.maintenanceAuditLog ?? [],
    maintenanceNotifications: payload.maintenanceNotifications ?? [],
  };
}

export async function fetchMaintenanceKpis(role: ApiMaintenanceUserRole = 'agent') {
  return api.get<{ total: number; overdue: number; breachRate: number }>(
    `/maintenance/kpis?role=${role}`,
  );
}

export async function setMaintenanceResponsibility(
  requestId: string,
  responsibility: MaintenanceWorkflowResponsibility,
  options?: {
    ccEmails?: string[];
    skipRecipientEmail?: boolean;
  },
): Promise<ApiMaintenanceState> {
  return api.patch<ApiMaintenanceState>(`/maintenance/requests/${requestId}/responsibility`, {
    responsibility,
    actorRole: AGENT_ROLE,
    ...(options?.ccEmails?.length ? { ccEmails: options.ccEmails } : {}),
    ...(options?.skipRecipientEmail ? { skipRecipientEmail: true } : {}),
  });
}

export async function requestMaintenanceEvidence(
  requestId: string,
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/transition-status', {
    requestId,
    toStatus: 'pending_evidence',
    actorRole: AGENT_ROLE,
  });
}

export async function transitionMaintenanceCase(
  requestId: string,
  toStatus: MaintenanceWorkflowStatus,
  extras?: {
    completionEvidenceUploaded?: boolean;
    agentApprovalReceived?: boolean;
    tenantApprovalReceived?: boolean;
    invoiceUploaded?: boolean;
  },
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/transition-status', {
    requestId,
    toStatus,
    actorRole: AGENT_ROLE,
    ...extras,
  });
}

/**
 * Close a case that should not proceed (duplicate, raised in error, resolved by the tenant …)
 * through the agent facade (`POST /agent/maintenance/:requestId/close`).
 *
 * The manual-close path — distinct from the completion close in `maintenance-case-ops.ts`. It
 * deliberately bypasses the completion gates and records a reason so a cancelled job stays
 * tellable from completed work. The API refuses (409) a job carrying commitments (an assigned
 * contractor, an approved quote, a booked visit) unless `acknowledgeCommitments` is set; the
 * dialog surfaces that message and re-sends with the flag. `actorRole` is derived server-side.
 */
export async function closeMaintenanceCaseWithReason(
  requestId: string,
  body: {
    reason: MaintenanceCloseReason;
    note?: string;
    acknowledgeCommitments?: boolean;
  },
): Promise<AgentMaintenanceCard> {
  const result = await crossub.POST('/agent/maintenance/{requestId}/close', {
    params: { path: { requestId } },
    body: {
      reason: body.reason,
      ...(body.note ? { note: body.note } : {}),
      ...(body.acknowledgeCommitments ? { acknowledgeCommitments: true } : {}),
    },
  });
  return unwrapAgentMaintenance(result, "Couldn't close the job");
}

/**
 * Read one maintenance job in full off the agent facade (`GET /agent/maintenance/:requestId`) —
 * the portfolio card plus its V2 spine: the quote-version chain (V1/V2… per contractor thread),
 * the active/latest work order, the latest reconciled invoice (with its read-only payment lane),
 * and any Account-Manager urgent authorisations. Read-only; the agent sees these, never sets them.
 */
export async function fetchAgentMaintenanceDetail(
  requestId: string,
): Promise<AgentMaintenanceDetail> {
  const result = await crossub.GET('/agent/maintenance/{requestId}', {
    params: { path: { requestId } },
  });
  return unwrapAgentMaintenance(result, 'Failed to load the maintenance job');
}

export async function setMaintenanceCompletionEvidence(
  requestId: string,
  uploaded: boolean,
): Promise<ApiMaintenanceState> {
  return api.patch<ApiMaintenanceState>(
    `/maintenance/requests/${requestId}/completion-evidence`,
    { uploaded, actorRole: AGENT_ROLE },
  );
}

export async function setMaintenanceAgentApproval(
  requestId: string,
  approved: boolean,
): Promise<ApiMaintenanceState> {
  return api.patch<ApiMaintenanceState>(
    `/maintenance/requests/${requestId}/agent-approval`,
    { approved, actorRole: AGENT_ROLE },
  );
}

export async function setMaintenanceTenantApproval(
  requestId: string,
  approved: boolean,
): Promise<ApiMaintenanceState> {
  return api.patch<ApiMaintenanceState>(
    `/maintenance/requests/${requestId}/tenant-approval`,
    { approved, actorRole: AGENT_ROLE },
  );
}

export async function setMaintenanceInvoiceUploaded(
  requestId: string,
  uploaded: boolean,
): Promise<ApiMaintenanceState> {
  return api.patch<ApiMaintenanceState>(`/maintenance/requests/${requestId}/invoice`, {
    uploaded,
    actorRole: AGENT_ROLE,
  });
}

/** Ranked contractor suggestion for a maintenance request (agency preferred list). */
export interface MaintenanceContractorSuggestion {
  id: string;
  contractorId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  serviceTypes: string[];
  isPreferred: boolean;
  isTopPick: boolean;
  rating: number | null;
}

export async function fetchMaintenanceContractorSuggestions(
  requestId: string,
): Promise<MaintenanceContractorSuggestion[]> {
  const result = await api.get<{
    recommendations: Array<{
      id: string;
      contractorId: string | null;
      name: string;
      email: string | null;
      phone: string | null;
      serviceTypes: string[];
      isPreferred: boolean;
      isTopPick: boolean;
      rating: number | null;
    }>;
  }>(`/maintenance/requests/${requestId}/contractor-recommendations`);

  return (result.recommendations ?? []).map((row) => ({
    id: row.id,
    contractorId: row.contractorId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    serviceTypes: row.serviceTypes ?? [],
    isPreferred: row.isPreferred,
    isTopPick: row.isTopPick,
    rating: row.rating,
  }));
}

export async function assignPreferredMaintenanceContractor(
  requestId: string,
  preferredContractorId: string,
): Promise<void> {
  await api.post(`/maintenance/requests/${requestId}/assign-contractor`, {
    preferredContractorId,
  });
}

export async function fetchContractorRfqEmailDraft(
  requestId: string,
  contractorName?: string,
): Promise<{ subject: string; bodyText: string; sampleContractorName: string }> {
  const qs = contractorName ? `?contractorName=${encodeURIComponent(contractorName)}` : '';
  return api.get(`/maintenance/requests/${requestId}/contractor-rfq-email-draft${qs}`);
}

export async function inviteMaintenanceContractorsForRfq(
  requestId: string,
  preferredContractorIds: string[],
  options?: {
    replaceExisting?: boolean;
    rfqMessage?: { subject: string; bodyText: string };
    previewContractorName?: string;
  },
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>(`/maintenance/requests/${requestId}/invite-contractors`, {
    preferredContractorIds,
    actorRole: AGENT_ROLE,
    ...(options?.replaceExisting ? { replaceExisting: true } : {}),
    ...(options?.rfqMessage
      ? {
          rfqMessage: options.rfqMessage,
          previewContractorName: options.previewContractorName,
        }
      : {}),
  });
}

export async function createMaintenanceQuotation(input: {
  maintenanceRequestId: string;
  contractorId: string;
  price: number;
  currency: 'AUD';
  scope: string;
  availableSchedule: string;
  lineItems?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceExGst: number;
    gst: number;
    amountIncGst: number;
  }>;
  comments?: string;
}): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/create', {
    ...input,
    actorRole: AGENT_ROLE,
  });
}

/**
 * Approve a specific submitted contractor quote through the agent facade
 * (`POST /agent/maintenance/:requestId/quotes/:quotationId/approve`). The server mints the
 * approved quote, issues the work order and advances the job — the same approval the staff
 * console runs — so no client-side quotation snapshot is needed any more.
 */
export async function approveMaintenanceQuotation(
  requestId: string,
  quotationId: string,
): Promise<AgentMaintenanceCard> {
  const result = await crossub.POST(
    '/agent/maintenance/{requestId}/quotes/{quotationId}/approve',
    { params: { path: { requestId, quotationId } } },
  );
  return unwrapAgentMaintenance(result, 'Failed to approve the quote');
}

/** Reject a specific submitted quote with a required reason (`…/quotes/:quotationId/reject`). */
export async function declineMaintenanceQuotation(
  requestId: string,
  quotationId: string,
  declineReason: string,
): Promise<AgentMaintenanceCard> {
  const result = await crossub.POST(
    '/agent/maintenance/{requestId}/quotes/{quotationId}/reject',
    { params: { path: { requestId, quotationId } }, body: { reason: declineReason } },
  );
  return unwrapAgentMaintenance(result, 'Failed to decline the quote');
}

export async function reviewMaintenanceQuotationDecision(
  quotationId: string,
  decision: 'approved' | 'declined',
  declineReason?: string,
  actorRole: ApiMaintenanceUserRole = AGENT_ROLE,
  quotationSnapshot?: {
    maintenanceRequestId: string;
    contractorId: string;
    price: number;
    currency?: 'AUD';
    scope: string;
    availableSchedule: string;
    submittedAt?: string;
    status?: 'submitted' | 'approved' | 'declined';
    lineItems?: ApiQuotation['lineItems'];
    comments?: string;
  },
  opts?: { skipRecipientEmail?: boolean },
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/review-decision', {
    quotationId,
    decision,
    declineReason,
    actorRole,
    ...(opts?.skipRecipientEmail ? { skipRecipientEmail: true } : {}),
    ...(quotationSnapshot ? { quotationSnapshot } : {}),
  });
}

export async function sendMaintenanceQuotationToLandlord(
  quotationId: string,
  actorRole: ApiMaintenanceUserRole = AGENT_ROLE,
  opts?: { skipRecipientEmail?: boolean },
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/send-to-landlord', {
    quotationId,
    actorRole,
    ...(opts?.skipRecipientEmail ? { skipRecipientEmail: true } : {}),
  });
}

export async function sendMaintenanceContractorFeedback(
  quotationId: string,
  feedbackMessage?: string,
  actorRole: ApiMaintenanceUserRole = AGENT_ROLE,
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/send-contractor-feedback', {
    quotationId,
    feedbackMessage,
    actorRole,
  });
}

/**
 * Send a price-review counter-offer on a submitted quote through the agent facade
 * (`…/quotes/:quotationId/price-review`). The contractor resubmits as the next version in the
 * negotiation thread (§10.1).
 */
export async function sendMaintenanceQuotationCounterOffer(
  requestId: string,
  quotationId: string,
  counterPrice: number,
  message?: string,
): Promise<AgentMaintenanceCard> {
  const result = await crossub.POST(
    '/agent/maintenance/{requestId}/quotes/{quotationId}/price-review',
    {
      params: { path: { requestId, quotationId } },
      body: { counterPrice, ...(message ? { message } : {}) },
    },
  );
  return unwrapAgentMaintenance(result, 'Failed to send the counter-offer');
}

export async function uploadMaintenanceAttachment(input: {
  maintenanceRequestId: string;
  kind: 'initial_evidence' | 'evidence' | 'invoice';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
}): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/attachments/upload', {
    ...input,
    actorRole: AGENT_ROLE,
  });
}

export async function deleteMaintenanceAttachment(
  attachmentId: string,
): Promise<ApiMaintenanceState> {
  return api.delete<ApiMaintenanceState>(`/maintenance/attachments/${attachmentId}`);
}

/** Run RFQ reminder / auto-reselect SLA tick (agent role). */
export async function runMaintenanceSlaTick(): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/sla/tick', { actorRole: AGENT_ROLE });
}

export async function respondMaintenanceSchedule(args: {
  requestId: string;
  decision: 'approved' | 'declined';
  declineReason?: string;
}): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/schedule/tenant-response', {
    requestId: args.requestId,
    decision: args.decision,
    declineReason: args.declineReason,
    actorRole: AGENT_ROLE,
  });
}

export async function fulfillContractorEvidenceRequest(args: {
  requestId: string;
  evidenceRequestId: string;
  fulfillmentNote?: string;
}): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/contractor-evidence-requests/fulfill', {
    ...args,
    actorRole: AGENT_ROLE,
  });
}
