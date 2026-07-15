'use client';

import { useCallback } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { isUuid } from '@/lib/file-upload';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { useLivePoll } from '@/lib/use-live-poll';

/** Poll the live leasing cycle and merge server open-inspection / task progress into the workflow store. */
export function useLeasingCycleLiveSync(
  propertyId: string,
  cycleId: string | null | undefined,
  enabled = true,
): void {
  const { apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);

  const syncCycle = useCallback(async () => {
    if (!enabled || !apiConnected || !cycleId || !isUuid(propertyId)) return;
    try {
      const view = await leasingOpsApi.syncApplications(cycleId);
      applyCycleView(propertyId, view);
    } catch {
      try {
        const view = await leasingOpsApi.get(cycleId);
        applyCycleView(propertyId, view);
      } catch {
        /* keep last known server snapshot */
      }
    }
  }, [enabled, apiConnected, cycleId, propertyId, applyCycleView]);

  useLivePoll(syncCycle, enabled && Boolean(cycleId));
}
