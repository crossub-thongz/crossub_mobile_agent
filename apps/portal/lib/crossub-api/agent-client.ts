import type { components } from '@crossub-thongz/api-contract';

import { crossub } from './client';

export type AgentAgency = components['schemas']['AgentAgencyResponseDto'];
export type AgentProperty = components['schemas']['AgentPropertyResponseDto'];

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
