import { api } from '@/lib/api';
import type {
  ApiMaintenanceState,
  ApiMaintenanceUserRole,
  ApiQuotation,
} from '@/lib/crossub-api/types';

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
  },
): Promise<ApiMaintenanceState> {
  return api.patch<ApiMaintenanceState>(`/maintenance/requests/${requestId}/responsibility`, {
    responsibility,
    actorRole: AGENT_ROLE,
    ...(options?.ccEmails?.length ? { ccEmails: options.ccEmails } : {}),
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

export async function setMaintenanceCompletionEvidence(
  requestId: string,
  uploaded: boolean,
): Promise<ApiMaintenanceState> {
  return api.patch<ApiMaintenanceState>(
    `/maintenance/requests/${requestId}/completion-evidence`,
    { uploaded, actorRole: AGENT_ROLE },
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

export async function inviteMaintenanceContractorsForRfq(
  requestId: string,
  preferredContractorIds: string[],
  options?: { replaceExisting?: boolean },
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>(`/maintenance/requests/${requestId}/invite-contractors`, {
    preferredContractorIds,
    actorRole: AGENT_ROLE,
    ...(options?.replaceExisting ? { replaceExisting: true } : {}),
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

export async function approveMaintenanceQuotation(
  quotationId: string,
  actorRole: ApiMaintenanceUserRole = 'agent',
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/approve', {
    quotationId,
    actorRole,
  });
}

export async function declineMaintenanceQuotation(
  quotationId: string,
  declineReason: string,
  actorRole: ApiMaintenanceUserRole = 'agent',
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/decline', {
    quotationId,
    declineReason,
    actorRole,
  });
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
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/review-decision', {
    quotationId,
    decision,
    declineReason,
    actorRole,
    ...(quotationSnapshot ? { quotationSnapshot } : {}),
  });
}

export async function sendMaintenanceQuotationToLandlord(
  quotationId: string,
  actorRole: ApiMaintenanceUserRole = AGENT_ROLE,
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/send-to-landlord', {
    quotationId,
    actorRole,
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

export async function sendMaintenanceQuotationCounterOffer(
  quotationId: string,
  counterPrice: number,
  message?: string,
  actorRole: ApiMaintenanceUserRole = AGENT_ROLE,
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/counter-offer', {
    quotationId,
    counterPrice,
    message,
    actorRole,
  });
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
