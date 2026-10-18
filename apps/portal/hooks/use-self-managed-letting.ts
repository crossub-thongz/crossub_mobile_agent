'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { SELF_MANAGED_LEASING_COPY } from '@/constants/self-managed-leasing';
import { runThenReadCycle } from '@/lib/leasing/self-managed-letting';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Runs one Self-Manage letting write at a time: the facade call, a cycle re-read into the
 * leasing store, then a toast. `pending` names the running action so its button can disable.
 */
export function useSelfManagedLettingAction(propertyId: string, cycleId: string | undefined) {
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async (
      key: string,
      action: (cycleId: string) => Promise<unknown>,
      success: string,
    ): Promise<boolean> => {
      if (!cycleId) {
        toast.error(SELF_MANAGED_LEASING_COPY.cycleMissing);
        return false;
      }
      setPending(key);
      try {
        const view = await runThenReadCycle(cycleId, action);
        applyCycleView(propertyId, view);
        toast.success(success);
        return true;
      } catch (err) {
        toast.error(apiErrorMessage(err));
        return false;
      } finally {
        setPending(null);
      }
    },
    [applyCycleView, cycleId, propertyId],
  );

  return { pending, run };
}
