'use client';

import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchPropertyTenancyOverview,
  type PropertyTenancyOverview,
} from '@/lib/crossub-api/agent-tenancy-client';

export type PropertyTenancyOverviewState = {
  /** This property's overview; null while the first read is in flight or when it failed. */
  record: PropertyTenancyOverview | null;
  /** True when the property is Self-Manage by the API's own per-property rule. */
  selfManaged: boolean;
  /** The read has answered for this property, with data or an error. */
  settled: boolean;
  error: unknown;
  reload: () => void;
};

/**
 * The Overview cards' and Tenancies section's read, and the Self-Manage answer that gates them.
 * A previous property's data is never returned for this one.
 */
export function usePropertyTenancyOverview(propertyId: string): PropertyTenancyOverviewState {
  const resource = useTrustResource(`tenancy-overview:${propertyId}`, () =>
    fetchPropertyTenancyOverview(propertyId),
  );
  const record = resource.data?.propertyId === propertyId ? resource.data : null;
  return {
    record,
    selfManaged: record?.selfManaged === true,
    settled: record != null || (resource.error != null && !resource.loading),
    error: resource.error,
    reload: resource.reload,
  };
}
