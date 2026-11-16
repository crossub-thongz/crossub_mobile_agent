import type { components } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/**
 * Add Property (Daniel's spec v1.0, 13 Nov 2026): a draft property, its owners and its
 * activation. Every call goes through the typed contract client.
 */
export type AgentPropertyRecord = components['schemas']['AgentPropertyResponseDto'];
export type AgentPropertyDraftBody = components['schemas']['CreateAgentPropertyDto'];
export type AgentPropertyOwner = components['schemas']['AgentPropertyOwnerDto'];
export type AgentPropertyOwnerInput = components['schemas']['AgentPropertyOwnerInputDto'];
export type AgentPropertyIntakeFailure = components['schemas']['AgentPropertyIntakeFailureDto'];
export type AgencyOwnerSearchItem = components['schemas']['PersonListItemDto'];
export type ActivatePropertyBody = components['schemas']['ActivateAgentPropertyDto'];

const propertyPath = (propertyId: string) => ({ path: { propertyId } });

export async function fetchPropertyRecord(propertyId: string): Promise<AgentPropertyRecord> {
  const result = await crossub.GET('/agent/properties/{propertyId}', {
    params: propertyPath(propertyId),
  });
  return unwrapCrossubResult(result, "Couldn't load the property");
}

/** Start a draft. The API refuses an address the agency already has. */
export async function createPropertyDraft(
  body: AgentPropertyDraftBody,
): Promise<AgentPropertyRecord> {
  const result = await crossub.POST('/agent/properties', {
    body: { ...body, registryIntakeComplete: false },
  });
  return unwrapCrossubResult(result, "Couldn't save the draft");
}

export async function updatePropertyDraft(
  propertyId: string,
  body: AgentPropertyDraftBody,
): Promise<AgentPropertyRecord> {
  const result = await crossub.PATCH('/agent/properties/{propertyId}', {
    params: propertyPath(propertyId),
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the draft");
}

export async function fetchPropertyOwners(propertyId: string): Promise<AgentPropertyOwner[]> {
  const result = await crossub.GET('/agent/properties/{propertyId}/owners', {
    params: propertyPath(propertyId),
  });
  return unwrapCrossubResult(result, "Couldn't load the owners").owners;
}

/** Save Owners: the whole set, all or nothing. */
export async function savePropertyOwners(
  propertyId: string,
  owners: AgentPropertyOwnerInput[],
): Promise<AgentPropertyOwner[]> {
  const result = await crossub.PUT('/agent/properties/{propertyId}/owners', {
    params: propertyPath(propertyId),
    body: { owners },
  });
  return unwrapCrossubResult(result, "Couldn't save the owners").owners;
}

export async function activateProperty(
  propertyId: string,
  body: ActivatePropertyBody,
): Promise<AgentPropertyRecord> {
  const result = await crossub.POST('/agent/properties/{propertyId}/activate', {
    params: propertyPath(propertyId),
    body,
  });
  return unwrapCrossubResult(result, "Couldn't activate the property");
}

/** Owners the agency already has, to link to another property. */
export async function searchAgencyOwners(
  agencyId: string,
  search: string,
  pageSize: number,
): Promise<AgencyOwnerSearchItem[]> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/owners', {
    params: { path: { agencyId }, query: { search, pageSize } },
  });
  return unwrapCrossubResult(result, "Couldn't search owners").items;
}
