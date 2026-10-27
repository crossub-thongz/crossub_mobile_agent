import type { components } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/**
 * A property's tenancies (Self-Manage, Daniel 27 Oct 2026): the read behind the Overview cards and
 * the Tenancies section, and the Self-Manage tenancy writes. Archive, restore and the current
 * tenancy pin are in `agent-client.ts`.
 */
export type PropertyTenancyOverview = components['schemas']['AgentPropertyTenancyOverviewDto'];
export type PropertyTenancyLease = components['schemas']['AgentLeaseHistoryDto'];
export type PropertyTenancyArchive = components['schemas']['AgentArchivedTenancyDto'];
export type PropertyTenancyContact = components['schemas']['AgentTenancyContactDto'];
export type PropertyTenancyCase = components['schemas']['AgentTenancyCaseDto'];
export type PropertyTenancyTenant = components['schemas']['AgentTenancyTenantDto'];
export type PropertyTenancyParty = components['schemas']['AgentTenancyPartyDto'];
export type ManualTenancyInput = components['schemas']['AddManualTenancyDto'];
export type ManualTenancyTenantInput = components['schemas']['ManualTenancyTenantDto'];
export type ManualTenancyAdded = components['schemas']['AgentManualTenancyAddedDto'];
export type TenantDetailsInput = components['schemas']['UpdateTenantDetailsDto'];
export type TenantDetailsUpdated = components['schemas']['AgentTenantDetailsUpdatedDto'];

const propertyPath = (propertyId: string) => ({ path: { propertyId } });

export async function fetchPropertyTenancyOverview(
  propertyId: string,
): Promise<PropertyTenancyOverview> {
  const result = await crossub.GET('/agent/properties/{propertyId}/tenancy-overview', {
    params: propertyPath(propertyId),
  });
  return unwrapCrossubResult(result, "Couldn't load the tenancies");
}

/** "+ Add tenancy": tenants and lease details by hand, without starting leasing. */
export async function addManualTenancy(
  propertyId: string,
  body: ManualTenancyInput,
): Promise<ManualTenancyAdded> {
  const result = await crossub.POST('/agent/properties/{propertyId}/tenancies', {
    params: propertyPath(propertyId),
    body,
  });
  return unwrapCrossubResult(result, "Couldn't add the tenancy");
}

/** Remove a manually added household that is still a draft or upcoming. */
export async function removeManualTenancy(
  propertyId: string,
  agreementIds: string[],
): Promise<number> {
  const result = await crossub.POST('/agent/properties/{propertyId}/tenancies/remove', {
    params: propertyPath(propertyId),
    body: { agreementIds },
  });
  return unwrapCrossubResult(result, "Couldn't remove the tenancy").removed;
}

export async function updateTenantDetails(
  propertyId: string,
  personId: string,
  body: TenantDetailsInput,
): Promise<TenantDetailsUpdated> {
  const result = await crossub.PATCH('/agent/properties/{propertyId}/tenants/{personId}', {
    params: { path: { propertyId, personId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the tenant");
}

/** Make a live contact the primary (notice recipient) for its role. */
export async function setPrimaryPropertyContact(
  propertyId: string,
  contactId: string,
): Promise<void> {
  const result = await crossub.POST('/agent/properties/{propertyId}/contacts/{contactId}/primary', {
    params: { path: { propertyId, contactId } },
  });
  unwrapCrossubResult(result, "Couldn't make this contact the primary");
}

/** "Archive incoming tenancy": the household signed on this letting is not moving in. */
export async function withdrawIncomingTenancy(
  propertyId: string,
  cycleId: string,
  reason: string,
): Promise<void> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/withdraw-tenancy',
    { params: { path: { propertyId, cycleId } }, body: { reason } },
  );
  unwrapCrossubResult(result, "Couldn't archive the incoming tenancy");
}
