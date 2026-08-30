'use client';

import { useEffect, useRef, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { isUuid } from '@/lib/file-upload';
import { fetchLeasingCycleView } from '@/lib/leasing/fetch-leasing-cycle';
import { mapServerCycleViewToLeasingCycle } from '@/lib/leasing/map-cycle';
import { isWithdrawnServerLeasingCycle } from '@/lib/leasing-cycle-types';
import type { LeasingCycle } from '@/lib/types';

export type ResolvedLeasingCycleState = 'pending' | 'ready' | 'missing';

/**
 * Resolve a new-leasing cycle for a detail URL. Completed onboarding sets
 * `isActive: false`, so the portfolio snapshot can lag or omit the row —
 * fetch by id instead of 404ing.
 */
export function useResolvedLeasingCycle(cycleId: string): {
  cycle: LeasingCycle | null;
  resolveState: ResolvedLeasingCycleState;
} {
  const { leasingCycles, apiConnected } = useAgentData();
  const fromList = leasingCycles.find((row) => row.id === cycleId) ?? null;
  const fromListRef = useRef(fromList);
  fromListRef.current = fromList;
  const [fetched, setFetched] = useState<LeasingCycle | null>(null);
  const [resolveState, setResolveState] = useState<ResolvedLeasingCycleState>(
    fromList ? 'ready' : 'pending',
  );

  useEffect(() => {
    const listed = fromListRef.current;
    if (!isUuid(cycleId)) {
      setFetched(null);
      setResolveState(listed ? 'ready' : 'missing');
      return;
    }

    if (!apiConnected) {
      setResolveState(listed ? 'ready' : 'missing');
      return;
    }

    let cancelled = false;
    setResolveState(listed ? 'ready' : 'pending');

    void fetchLeasingCycleView(cycleId)
      .then((view) => {
        if (cancelled) return;
        if (isWithdrawnServerLeasingCycle(view)) {
          setFetched(null);
          setResolveState(listed ? 'ready' : 'missing');
          return;
        }
        setFetched(mapServerCycleViewToLeasingCycle(view));
        setResolveState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        if (listed) return;
        setResolveState('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [apiConnected, cycleId]);

  const cycle = fromList ?? fetched;

  return {
    cycle,
    resolveState: cycle ? 'ready' : resolveState,
  };
}
