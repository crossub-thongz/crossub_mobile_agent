'use client';

import { useEffect, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  listPropertyContacts,
  type AgentPropertyContact,
} from '@/lib/crossub-api/agent-client';
import {
  householdTenantsFromOverview,
} from '@/lib/property-parties';
import type { Property } from '@/lib/types';

/** The household's Tenant 1 — flagged primary contact, not the newest invitee. */
export function usePrimaryTenantName(
  property: Property | null | undefined,
  fallback?: string | null,
): string {
  const { apiConnected } = useAgentData();
  const propertyId = property?.id;
  const [contacts, setContacts] = useState<AgentPropertyContact[]>([]);

  useEffect(() => {
    if (!apiConnected || !propertyId) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    void listPropertyContacts(propertyId)
      .then((rows) => {
        if (!cancelled) setContacts(rows.filter((row) => row.role === 'TENANT'));
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiConnected, propertyId]);

  if (!property) return fallback?.trim() || '—';
  if (property.leaseStatus === 'vacant') return 'Vacant';

  const household = householdTenantsFromOverview({
    property,
    contacts,
  });
  return (
    household[0]?.name?.trim() ||
    fallback?.trim() ||
    property.tenantName?.trim() ||
    '—'
  );
}
