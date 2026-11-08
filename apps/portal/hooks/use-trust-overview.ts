'use client';

import { useTrustResource, type TrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustOverview, type TrustOverview } from '@/lib/crossub-api/agent-trust-client';

/** The trust account's overview figures: the Overview, Disbursement and Reconciliation tiles read them. */
export function useTrustOverview(agencyId: string, bankAccountId: string): TrustResource<TrustOverview> {
  return useTrustResource(`${agencyId}:${bankAccountId}:overview`, () =>
    fetchTrustOverview(agencyId, bankAccountId),
  );
}
