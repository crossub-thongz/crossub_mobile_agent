'use client';

import { useMemo } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import type { AgentCopyVariant } from '@/constants/agent-copy-variant';
import {
  agentCopyVariant,
  isPropertySelfManaged,
  isSelfManagedAgent,
} from '@/lib/portal-service-level';

/**
 * Copy set for the signed-in agent. With a property's agency id it follows that agency's tier;
 * without one it is portfolio-wide (Self-Manage only when every assigned agency is).
 */
export function useAgentCopyVariant(propertyAgencyId?: string): AgentCopyVariant {
  const { agencies } = useAgentData();
  return useMemo(
    () =>
      agentCopyVariant(
        propertyAgencyId
          ? isPropertySelfManaged(agencies, propertyAgencyId)
          : isSelfManagedAgent(agencies),
      ),
    [agencies, propertyAgencyId],
  );
}
