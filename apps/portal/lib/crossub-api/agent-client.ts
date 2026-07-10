import type { components } from '@crossub-thongz/api-contract';

import { crossub } from './client';

export type AgentAgency = components['schemas']['AgentAgencyResponseDto'];
export type AgentProperty = components['schemas']['AgentPropertyResponseDto'];

export type AgentInspection = components['schemas']['AgentInspectionDto'];
export type AgentMaintenance = components['schemas']['AgentMaintenanceDto'];
export type AgentRentReview = components['schemas']['AgentRentReviewDto'] & {
  leaseStart?: string | null;
  leaseEnd?: string | null;
  agreedRent?: number | null;
  dateStarted?: string | null;
  createdAt?: string | null;
  leaseType?: 'fixed' | 'periodic' | null;
  fixedTermWeeks?: number | null;
};
export type AgentVacating = components['schemas']['AgentVacatingDto'];
export type AgentTenantSelection =
  components['schemas']['AgentTenantSelectionDto'];
export type AgentLeasing = components['schemas']['AgentLeasingDto'];
export type AgentAccounting = components['schemas']['AgentAccountingDto'];
export type AgentTribunal = components['schemas']['AgentTribunalDto'];
export type AgentLeasingCycle = {
  id: string;
  propertyId: string;
  propertyAddress: string;
  lifecycleStep: string;
  onboardingStepId?: string | null;
  rentPerWeek?: number | null;
  availableFrom?: string | null;
};
export type AgentPortfolio = components['schemas']['AgentPortfolioResponseDto'] & {
  leasingCycles?: AgentLeasingCycle[];
};

export type AgentMessageThread =
  components['schemas']['AgentMessageThreadResponseDto'];
export type AgentThreadMessage =
  components['schemas']['AgentThreadMessageResponseDto'];
export type CreateAgentThreadInput =
  components['schemas']['CreateAgentMessageThreadDto'];
export type AgentNotificationDto =
  components['schemas']['AgentNotificationResponseDto'];
export type AgentDocumentDto =
  components['schemas']['AgentDocumentResponseDto'];
export type UploadAgentDocumentInput =
  components['schemas']['UploadAgentDocumentDto'];

/** Assigned client agencies (`GET /api/v1/agent/agencies`). */
export async function fetchAgencies(): Promise<AgentAgency[]> {
  const { data, error } = await crossub.GET('/agent/agencies');
  if (error || !data) throw new Error('Failed to load agencies');
  return data.items;
}

/** One agency by id (`GET /api/v1/agent/agencies/{agencyId}`). */
export async function fetchAgency(agencyId: string): Promise<AgentAgency> {
  const { data, error } = await crossub.GET('/agent/agencies/{agencyId}', {
    params: { path: { agencyId } },
  });
  if (error || !data) throw new Error('Failed to load agency');
  return data;
}

/** Properties across the assigned agencies (`GET /api/v1/agent/properties`). */
export async function fetchProperties(): Promise<AgentProperty[]> {
  const data = await agentFetch<{ items: AgentProperty[] }>('/agent/properties');
  return data.items;
}

/** Register a property under the agent's profile agency (`POST /api/v1/agent/properties`). */
export type CreateAgentPropertyInput = {
  address: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  propertyType?: string;
  status?: string;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  furnished?: boolean;
  landlordName?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  latitude?: number;
  longitude?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  nextRentReviewAt?: string;
  rentWeekly?: number;
  bondAmount?: number;
  depositAmount?: number;
  buildingName?: string;
  strataPlanNumber?: string;
  buildingManagerName?: string;
  buildingManagerEmail?: string;
  buildingManagerPhone?: string;
  strataContactName?: string;
  strataContactEmail?: string;
  strataContactPhone?: string;
  landlordInsuranceExpiry?: string;
  administrationFee?: number;
  documentationFee?: number;
  lettingFee?: number;
  managementRatePercent?: number;
  managementRateGst?: 'include' | 'exclude';
};

export async function createProperty(
  body: CreateAgentPropertyInput,
): Promise<AgentProperty> {
  return agentFetch<AgentProperty>('/agent/properties', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** End agency management on a property (`POST /agent/properties/{propertyId}/end-management`). */
export async function endPropertyManagement(
  propertyId: string,
  input: { endOfManagementDate: string },
): Promise<void> {
  await agentFetch<void>(`/agent/properties/${propertyId}/end-management`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Onboard a client agency (`POST /api/v1/agent/agencies`). */
export type CreateAgentAgencyInput = {
  name: string;
  company?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export async function createAgency(body: CreateAgentAgencyInput): Promise<AgentAgency> {
  return agentFetch<AgentAgency>('/agent/agencies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** One property by id (`GET /api/v1/agent/properties/{propertyId}`). */
export async function fetchProperty(propertyId: string): Promise<AgentProperty> {
  const { data, error } = await crossub.GET('/agent/properties/{propertyId}', {
    params: { path: { propertyId } },
  });
  if (error || !data) throw new Error('Failed to load property');
  return data;
}

/**
 * The whole operational portfolio in one snapshot (`GET /api/v1/agent/portfolio`) —
 * inspections, maintenance, rent reviews, vacating, tenant selections, leasing,
 * accounting and tribunal, scoped to the assigned agencies and keyed by real property ids.
 */
export async function fetchPortfolio(): Promise<AgentPortfolio> {
  const { data, error } = await crossub.GET('/agent/portfolio');
  if (error || !data) throw new Error('Failed to load portfolio');
  return data;
}

/** Approve a contractor's quote (`POST /agent/maintenance/{requestId}/approve`). */
export async function approveMaintenance(
  requestId: string,
): Promise<AgentMaintenance> {
  const { data, error } = await crossub.POST(
    '/agent/maintenance/{requestId}/approve',
    { params: { path: { requestId } } },
  );
  if (error || !data) throw new Error('Failed to approve maintenance quote');
  return data;
}

/** Decline a contractor's quote (`POST /agent/maintenance/{requestId}/decline`). */
export async function declineMaintenance(
  requestId: string,
  reason: string,
): Promise<AgentMaintenance> {
  const { data, error } = await crossub.POST(
    '/agent/maintenance/{requestId}/decline',
    { params: { path: { requestId } }, body: { reason } },
  );
  if (error || !data) throw new Error('Failed to decline maintenance quote');
  return data;
}

/** Message threads across the agent's managed properties (`GET /agent/messages`). */
export async function fetchMessageThreads(): Promise<AgentMessageThread[]> {
  const { data, error } = await crossub.GET('/agent/messages');
  if (error || !data) throw new Error('Failed to load message threads');
  return data;
}

/** Message Center — linked mailboxes + full correspondence (`GET /agent/message-center`). */
export type AgentLinkedMailbox = {
  id: string;
  provider: 'GMAIL' | 'YAHOO';
  email: string;
  status: 'ACTIVE' | 'ERROR' | 'REVOKED';
  lastSyncAt: string | null;
  lastError: string | null;
};

export interface AgentMessageCenter {
  linkedMailboxes: AgentLinkedMailbox[];
  selectedMailboxId: string | null;
  threads: AgentMessageThread[];
}

export async function fetchMessageCenter(
  mailboxId?: string,
): Promise<AgentMessageCenter> {
  const q = mailboxId ? `?mailboxId=${encodeURIComponent(mailboxId)}` : '';
  return agentFetch<AgentMessageCenter>(`/agent/message-center${q}`);
}

/** Gmail/Yahoo mailboxes linked to the signed-in agent (`GET /agent/mailboxes`). */
export async function fetchMailboxes(): Promise<AgentLinkedMailbox[]> {
  return agentFetch<AgentLinkedMailbox[]>('/agent/mailboxes');
}

/** Start Gmail OAuth (`POST /agent/mailboxes/google/connect`). */
export async function connectGmail(): Promise<{ authorizationUrl: string }> {
  return agentFetch('/agent/mailboxes/google/connect', { method: 'POST' });
}

/** Start Yahoo OAuth (`POST /agent/mailboxes/yahoo/connect`). */
export async function connectYahoo(): Promise<{ authorizationUrl: string }> {
  return agentFetch('/agent/mailboxes/yahoo/connect', { method: 'POST' });
}

/** Disconnect a linked mailbox (`DELETE /agent/mailboxes/{mailboxId}`). */
export async function disconnectMailbox(mailboxId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/agent/mailboxes/${mailboxId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await parseApiError(res));
}

/** Manually sync a linked mailbox (`POST /agent/mailboxes/{mailboxId}/sync`). */
export async function syncMailbox(mailboxId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/agent/mailboxes/${mailboxId}/sync`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await parseApiError(res));
}

/** Server-side Gmail/Yahoo OAuth readiness (`GET /agent/mailboxes/config`). */
export interface AgentMailboxLinkConfig {
  gmail: boolean;
  yahoo: boolean;
  encryptionKey: boolean;
}

export async function fetchMailboxLinkConfig(): Promise<AgentMailboxLinkConfig> {
  return agentFetch<AgentMailboxLinkConfig>('/agent/mailboxes/config');
}

/** Reply in Message Center — CROSSUB or external Gmail/Yahoo thread. */
export async function replyInMessageCenter(
  threadId: string,
  body: string,
): Promise<AgentMessageThread> {
  return agentFetch<AgentMessageThread>(
    `/agent/message-center/threads/${encodeURIComponent(threadId)}/reply`,
    { method: 'POST', body: JSON.stringify({ body }) },
  );
}

/** Append a reply to one thread (`POST /agent/messages/{threadId}/reply`). */
export async function replyToThread(
  threadId: string,
  body: string,
): Promise<AgentMessageThread> {
  const { data, error } = await crossub.POST(
    '/agent/messages/{threadId}/reply',
    { params: { path: { threadId } }, body: { body } },
  );
  if (error || !data) throw new Error('Failed to send message');
  return data;
}

/** Open a new thread with its first message (`POST /agent/messages`). */
export async function createThread(
  input: CreateAgentThreadInput,
): Promise<AgentMessageThread> {
  const { data, error } = await crossub.POST('/agent/messages', { body: input });
  if (error || !data) throw new Error('Failed to open message thread');
  return data;
}

/** Notifications for the signed-in agent (`GET /agent/notifications`). */
export async function fetchNotifications(): Promise<AgentNotificationDto[]> {
  const { data, error } = await crossub.GET('/agent/notifications');
  if (error || !data) throw new Error('Failed to load notifications');
  return data;
}

/** Mark one notification read (`PATCH /agent/notifications/{notificationId}/read`). */
export async function markNotificationRead(
  notificationId: string,
): Promise<AgentNotificationDto> {
  const { data, error } = await crossub.PATCH(
    '/agent/notifications/{notificationId}/read',
    { params: { path: { notificationId } } },
  );
  if (error || !data) throw new Error('Failed to mark notification read');
  return data;
}

/** Mark all unread notifications read (`POST /agent/notifications/read-all`). */
export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const { data, error } = await crossub.POST('/agent/notifications/read-all');
  if (error || !data) throw new Error('Failed to mark all notifications read');
  return data;
}

/** Documents across the agent's managed properties (`GET /agent/documents`). */
export async function fetchDocuments(): Promise<AgentDocumentDto[]> {
  const { data, error } = await crossub.GET('/agent/documents');
  if (error || !data) throw new Error('Failed to load documents');
  return data;
}

/** Upload a document, base64-through-API → R2 (`POST /agent/documents`). */
export async function uploadDocument(
  input: UploadAgentDocumentInput,
): Promise<AgentDocumentDto> {
  const { data, error } = await crossub.POST('/agent/documents', { body: input });
  if (error || !data) throw new Error('Failed to upload document');
  return data;
}

/** Same as `uploadDocument`, with XMLHttpRequest upload progress (40–100% of caller scale). */
export async function uploadDocumentWithProgress(
  input: UploadAgentDocumentInput,
  onNetworkProgress?: (networkPercent: number) => void,
): Promise<AgentDocumentDto> {
  const url = `${API_BASE}/agent/documents`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onNetworkProgress) {
        onNetworkProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onNetworkProgress?.(100);
        try {
          resolve(JSON.parse(xhr.responseText) as AgentDocumentDto);
        } catch {
          reject(new Error('Failed to upload document'));
        }
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string | string[] };
        const message =
          typeof body.message === 'string'
            ? body.message
            : Array.isArray(body.message)
              ? body.message.join(', ')
              : `Request failed: ${xhr.status}`;
        reject(new Error(message));
      } catch {
        reject(new Error(`Request failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Failed to upload document'));
    xhr.send(JSON.stringify(input));
  });
}

/** Key-collection DTOs — present on backend; awaiting api-contract publish. */
export interface AgentKeyCollectionReport {
  submittedAt: string | null;
  tagNumber: string | null;
  keysCount: number | null;
  entryDoorCount: number | null;
  windowSlidingCount: number | null;
  fobsCount: number | null;
  remoteControlCount: number | null;
  mailboxCount: number | null;
  othersCount: number | null;
}

export interface AgentKeyCollection {
  time: string | null;
  location: string | null;
  custody?: string | null;
  status?: string | null;
  photos?: string[];
  report?: AgentKeyCollectionReport | null;
}

/** Body for `POST /agent/properties/{propertyId}/key-collection/report`. */
export interface AgentKeyCollectionReportInput {
  photos?: string[];
  tagNumber?: string;
  keysCount?: number;
  entryDoorCount?: number;
  windowSlidingCount?: number;
  fobsCount?: number;
  remoteControlCount?: number;
  mailboxCount?: number;
  othersCount?: number;
}

/** Tenant login within the agent's book (backend `AgentTenantResponseDto`). */
export interface AgentTenantAccount {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  propertyId: string | null;
  propertyAddress: string | null;
  applicationId: string | null;
  applicationStatus: string | null;
}

interface PaginatedAgentTenants {
  items: AgentTenantAccount[];
  total: number;
  page: number;
  pageSize: number;
}

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/v1`;

async function parseApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      message?: string | string[] | { message?: string | string[] };
    };
    const raw = body.message;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw.join(', ');
    if (raw && typeof raw === 'object') {
      const nested = raw.message;
      if (typeof nested === 'string') return nested;
      if (Array.isArray(nested)) return nested.join(', ');
    }
  } catch {
    // ignore non-JSON bodies
  }
  return `Request failed: ${res.status}`;
}

export async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Key-collection state for a property's active leasing cycle. */
export async function fetchKeyCollection(propertyId: string): Promise<AgentKeyCollection> {
  return agentFetch(`/agent/properties/${propertyId}/key-collection`);
}

/** Set key-collection time and place — synced to Tenant onboarding + Inspector jobs. */
export async function setKeyCollection(
  propertyId: string,
  input: { time: string; location: string },
): Promise<AgentKeyCollection> {
  return agentFetch(`/agent/properties/${propertyId}/key-collection`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/**
 * Submit the full key-collection handover report (checklist counts +
 * proof-photo URLs) — `POST /agent/properties/{propertyId}/key-collection/report`.
 */
export async function submitKeyCollectionReport(
  propertyId: string,
  input: AgentKeyCollectionReportInput,
): Promise<AgentKeyCollection> {
  return agentFetch(`/agent/properties/${propertyId}/key-collection/report`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Upload a key-handover proof photo (base64 → R2), returns the public URL for
 * inclusion in the report's `photos` —
 * `POST /agent/properties/{propertyId}/key-collection/photos/upload`.
 */
export async function uploadKeyCollectionPhoto(
  propertyId: string,
  input: { fileName: string; mimeType: string; sizeBytes: number; contentBase64: string },
): Promise<{ url: string }> {
  return agentFetch(`/agent/properties/${propertyId}/key-collection/photos/upload`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Tenant logins within the agent's book — the read side of tenant
 * provisioning (`GET /agent/tenants`). Newest first.
 */
export async function fetchAgentTenants(): Promise<AgentTenantAccount[]> {
  const result = await agentFetch<PaginatedAgentTenants>(
    '/agent/tenants?page=1&pageSize=100',
  );
  return result.items;
}
