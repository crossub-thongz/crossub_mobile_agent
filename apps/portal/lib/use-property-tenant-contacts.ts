'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  listPropertyContacts,
  type AgentPropertyContact,
} from '@/lib/crossub-api/agent-client';

const tenantContactsCache = new Map<string, AgentPropertyContact[]>();
const tenantContactsInflight = new Set<string>();
const tenantContactsListeners = new Set<() => void>();

function notifyTenantContactsListeners() {
  for (const listener of tenantContactsListeners) listener();
}

/** TENANT contacts for the given properties, cached for the session. */
export function usePropertyTenantContacts(
  propertyIds: string[],
): Record<string, AgentPropertyContact[]> {
  const { apiConnected } = useAgentData();
  const idsKey = propertyIds.join('|');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onUpdate = () => setVersion((value) => value + 1);
    tenantContactsListeners.add(onUpdate);
    return () => {
      tenantContactsListeners.delete(onUpdate);
    };
  }, []);

  useEffect(() => {
    if (!apiConnected || !idsKey) return;
    const ids = idsKey.split('|').filter(Boolean);
    const missing = ids.filter(
      (id) => !tenantContactsCache.has(id) && !tenantContactsInflight.has(id),
    );
    if (missing.length === 0) return;
    for (const id of missing) tenantContactsInflight.add(id);
    void Promise.all(
      missing.map(async (id) => {
        try {
          const rows = await listPropertyContacts(id);
          tenantContactsCache.set(
            id,
            rows.filter((row) => row.role === 'TENANT'),
          );
        } catch {
          tenantContactsCache.set(id, []);
        } finally {
          tenantContactsInflight.delete(id);
        }
      }),
    ).then(() => {
      notifyTenantContactsListeners();
    });
  }, [apiConnected, idsKey]);

  return useMemo(() => {
    const out: Record<string, AgentPropertyContact[]> = {};
    for (const id of idsKey.split('|').filter(Boolean)) {
      const rows = tenantContactsCache.get(id);
      if (rows) out[id] = rows;
    }
    return out;
  }, [idsKey, version]);
}
