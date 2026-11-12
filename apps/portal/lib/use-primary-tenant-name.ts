'use client';

import { useMemo } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { usePropertyTenantContacts } from '@/lib/use-property-tenant-contacts';
import { householdTenantsFromOverview, type HouseholdTenant } from '@/lib/property-parties';
import type { Property } from '@/lib/types';

/**
 * Everyone on the current tenancy, primary first. `ready` is false while tenant contacts
 * are still loading, so a caller does not treat the registry's single tenant as the household.
 */
export function useHouseholdTenants(property: Property | null | undefined): {
  tenants: HouseholdTenant[];
  ready: boolean;
} {
  const { apiConnected } = useAgentData();
  const propertyId = property?.id;
  const byProperty = usePropertyTenantContacts(apiConnected && propertyId ? [propertyId] : []);
  const cached = propertyId ? byProperty[propertyId] : undefined;
  const ready = !apiConnected || !propertyId || cached !== undefined;
  const tenants = useMemo(() => {
    if (!property || property.leaseStatus === 'vacant') return [];
    return householdTenantsFromOverview({
      property,
      contacts: cached ?? [],
    });
  }, [cached, property]);
  return { tenants, ready };
}

/** The household's Tenant 1 — flagged primary contact, not the newest invitee. */
export function usePrimaryTenantName(
  property: Property | null | undefined,
  fallback?: string | null,
): string {
  const { tenants } = useHouseholdTenants(property);
  if (!property) return fallback?.trim() || '—';
  if (property.leaseStatus === 'vacant') return 'Vacant';
  return (
    tenants[0]?.name?.trim() ||
    fallback?.trim() ||
    property.tenantName?.trim() ||
    '—'
  );
}
