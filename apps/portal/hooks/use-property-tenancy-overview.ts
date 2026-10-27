'use client';

import { useTrustResource, type TrustResource } from '@/hooks/use-trust-resource';
import {
  fetchPropertyTenancyOverview,
  type PropertyTenancyOverview,
} from '@/lib/crossub-api/agent-tenancy-client';

/** The Overview cards' and Tenancies section's read. `enabled` false loads nothing. */
export function usePropertyTenancyOverview(
  propertyId: string,
  enabled: boolean,
): TrustResource<PropertyTenancyOverview> {
  return useTrustResource(enabled ? `tenancy-overview:${propertyId}` : null, () =>
    fetchPropertyTenancyOverview(propertyId),
  );
}
