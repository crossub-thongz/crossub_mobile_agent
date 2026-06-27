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
