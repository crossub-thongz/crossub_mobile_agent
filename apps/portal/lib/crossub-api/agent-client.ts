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
