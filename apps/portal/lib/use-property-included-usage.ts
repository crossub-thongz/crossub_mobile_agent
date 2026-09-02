'use client';

import { useEffect, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  fetchAgentBillingPricing,
  type AgentBillingIncludedUsageRow,
} from '@/lib/crossub-api/agent-billing-client';
import { isPropertyInspectionOnly } from '@/lib/portal-service-level';

/** Yearly routine / ingoing / outgoing remaining for a Full Service or legacy property. */
export function usePropertyIncludedUsage(
  propertyId: string,
  agencyId?: string,
): AgentBillingIncludedUsageRow | null {
  const { agencies, platformBillingDisabled } = useAgentData();
  const eligible =
    !platformBillingDisabled && !isPropertyInspectionOnly(agencies, agencyId);

  const [usage, setUsage] = useState<AgentBillingIncludedUsageRow | null>(null);

  useEffect(() => {
    if (!eligible || !propertyId) {
      setUsage(null);
      return;
    }

    let cancelled = false;
    void fetchAgentBillingPricing()
      .then((catalog) => {
        if (cancelled) return;
        const row =
          catalog.level2.includedUsageByProperty?.find((item) => item.propertyId === propertyId) ??
          null;
        setUsage(row);
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [eligible, propertyId]);

  return usage;
}
