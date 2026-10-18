'use client';

import { useMemo } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  hasSelfManagedAgency,
  hasSelfManagedPrincipalAccess,
  selfManagedPropertyIds,
  type SelfManagedNavAccess,
} from '@/lib/portal-service-level';

export type SelfManagedAccess = SelfManagedNavAccess & {
  /** False while the first portfolio load is in flight — wait before redirecting. */
  ready: boolean;
};

/**
 * Self-Manage switches for nav and the desktop module pages. Agencies that failed to load
 * resolve to "not Self-Manage", so every other tier keeps today's UX.
 */
export function useSelfManagedAccess(): SelfManagedAccess {
  const { agencies, loading } = useAgentData();
  return useMemo(
    () => ({
      ready: !loading,
      selfManaged: hasSelfManagedAgency(agencies),
      selfManagedPrincipal: hasSelfManagedPrincipalAccess(agencies),
    }),
    [agencies, loading],
  );
}

/** Ids of the properties (live and archived) whose agency is Self-Manage — the Self-Manage screens' scope. */
export function useSelfManagedPropertyIds(): Set<string> {
  const { agencies, properties, archivedProperties } = useAgentData();
  return useMemo(
    () => selfManagedPropertyIds(agencies, [...properties, ...archivedProperties]),
    [agencies, archivedProperties, properties],
  );
}

/** True when this property's agency is Self-Manage — the agent runs the steps CROSSUB runs elsewhere. */
export function useIsPropertySelfManaged(propertyId: string | null | undefined): boolean {
  const ids = useSelfManagedPropertyIds();
  return propertyId ? ids.has(propertyId) : false;
}
