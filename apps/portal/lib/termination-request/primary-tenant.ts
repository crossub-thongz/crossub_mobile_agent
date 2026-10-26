import type { AgentPropertyContact } from '@/lib/crossub-api/agent-client';
import { isPropertyVacant } from '@/lib/property-leasing';
import { householdTenantsFromOverview, readRegistryDraftParties } from '@/lib/property-parties';
import { resolveCurrentTenancyRefs } from '@/lib/tenancy-references';
import type { LeasingRecord, Property } from '@/lib/types';

export type TerminationPrimaryTenant = {
  referenceId: string;
  name: string;
};

/** Primary tenant only: reference id plus name. Co-tenants stay off this form. */
export function primaryTenantForTermination(input: {
  property: Property;
  contacts?: AgentPropertyContact[];
  leaseId?: string | null;
  leases?: LeasingRecord[];
}): TerminationPrimaryTenant | null {
  const leases = input.leases ?? [];
  if (isPropertyVacant(input.property, leases)) return null;

  const draftTenants = readRegistryDraftParties(input.property.registryDraft, 'tenants');
  const household = householdTenantsFromOverview({
    isVacant: false,
    property: {
      tenantName: input.property.tenantName,
      tenantContact: input.property.tenantContact,
      additionalTenants: input.property.additionalTenants,
    },
    contacts: input.contacts?.length ? input.contacts : draftTenants,
  });
  const primary = household.find((tenant) => tenant.isPrimary) ?? household[0];
  const name = primary?.name?.trim() ?? '';
  if (!name || name.toLowerCase() === 'vacant') return null;

  const refs = resolveCurrentTenancyRefs({
    tenants: household,
    leaseId: input.leaseId,
    propertyId: input.property.id,
  });
  return { referenceId: refs.primary, name };
}
