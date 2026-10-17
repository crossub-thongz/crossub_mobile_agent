'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  fetchOwnerDecisions,
  type AgentOwnerDecision,
  type AgentOwnerDecisionCaseType,
} from '@/lib/crossub-api/agent-client';

export type OwnerDecisionsState = {
  items: AgentOwnerDecision[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** Decisions on one property (optionally one job), newest first. Refetches when `refreshToken` changes. */
export function useOwnerDecisions(
  propertyId: string,
  filter: { caseType?: AgentOwnerDecisionCaseType; caseId?: string },
  refreshToken = 0,
): OwnerDecisionsState {
  const { caseType, caseId } = filter;
  const [items, setItems] = useState<AgentOwnerDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchOwnerDecisions(propertyId, { caseType, caseId })
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setItems([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, caseType, caseId, refreshToken, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  return { items, loading, error, reload };
}
