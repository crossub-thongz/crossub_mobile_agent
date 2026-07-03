import type { components } from '@crossub-thongz/api-contract';

import { crossub } from './client';

export type AgentAgency = components['schemas']['AgentAgencyResponseDto'];
export type AgentProperty = components['schemas']['AgentPropertyResponseDto'];

export type AgentPortfolio = components['schemas']['AgentPortfolioResponseDto'];
export type AgentInspection = components['schemas']['AgentInspectionDto'];
export type AgentMaintenance = components['schemas']['AgentMaintenanceDto'];
export type AgentRentReview = components['schemas']['AgentRentReviewDto'];
export type AgentVacating = components['schemas']['AgentVacatingDto'];
export type AgentTenantSelection =
  components['schemas']['AgentTenantSelectionDto'];
export type AgentLeasing = components['schemas']['AgentLeasingDto'];
export type AgentAccounting = components['schemas']['AgentAccountingDto'];
export type AgentTribunal = components['schemas']['AgentTribunalDto'];

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
  const { data, error } = await crossub.GET('/agent/properties');
  if (error || !data) throw new Error('Failed to load properties');
  return data.items;
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

async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
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
