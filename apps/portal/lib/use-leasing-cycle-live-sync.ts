'use client';

import { useCallback, useRef } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { isUuid } from '@/lib/file-upload';
import { fetchLeasingCycleView } from '@/lib/leasing/fetch-leasing-cycle';
import type { ServerLeasingCycleView } from '@/lib/leasing-cycle-types';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { LEASING_CYCLE_POLL_MS } from '@/lib/live-sync';
import { useLivePoll } from '@/lib/use-live-poll';

export type LeasingCycleLiveSyncOptions = {
  onSynced?: (view: ServerLeasingCycleView) => void;
};

/** Poll the live leasing cycle and merge server open-inspection / task progress into the workflow store. */
export function useLeasingCycleLiveSync(
  propertyId: string,
  cycleId: string | null | undefined,
  enabled = true,
  options?: LeasingCycleLiveSyncOptions,
): void {
  const { apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const syncInFlightRef = useRef(false);
  const onSyncedRef = useRef(options?.onSynced);
  onSyncedRef.current = options?.onSynced;

  const syncCycle = useCallback(async () => {
    if (!enabled || !apiConnected || !cycleId || !isUuid(cycleId) || !isUuid(propertyId)) {
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    if (syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    try {
      const view = await fetchLeasingCycleView(cycleId);
      applyCycleView(propertyId, view);
      onSyncedRef.current?.(view);
    } catch {
      /* keep last known server snapshot */
    } finally {
      syncInFlightRef.current = false;
    }
  }, [enabled, apiConnected, cycleId, propertyId, applyCycleView]);

  useLivePoll(syncCycle, enabled && Boolean(cycleId), LEASING_CYCLE_POLL_MS);
}
