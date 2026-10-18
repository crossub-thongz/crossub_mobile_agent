'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  fetchAgentMaintenanceDetail,
  type AgentMaintenanceDetail,
} from '@/lib/crossub-api/maintenance-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export type SelfManagedMaintenanceRun = (
  action: () => Promise<AgentMaintenanceDetail>,
  successMessage: string,
) => Promise<boolean>;

/**
 * One job's detail for the Self-Manage action panel, and a runner for its actions: each action
 * returns the refreshed detail, which replaces the one on screen. The runner toasts the outcome
 * and reports whether it worked, so a form can clear itself only on success.
 */
export function useSelfManagedMaintenance(requestId: string, onChanged?: () => void) {
  const [detail, setDetail] = useState<AgentMaintenanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadToken, setLoadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setError(null);
    fetchAgentMaintenanceDetail(requestId)
      .then((next) => {
        if (!controller.signal.aborted) setDetail(next);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(apiErrorMessage(err));
      });
    return () => controller.abort();
  }, [requestId, loadToken]);

  const reload = useCallback(() => setLoadToken((n) => n + 1), []);

  const run = useCallback<SelfManagedMaintenanceRun>(
    async (action, successMessage) => {
      setBusy(true);
      try {
        const next = await action();
        // A combine returns the surviving job; this pane stays on the one it was opened for.
        if (next.id === requestId) setDetail(next);
        else reload();
        toast.success(successMessage);
        onChanged?.();
        return true;
      } catch (err) {
        toast.error(apiErrorMessage(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onChanged, reload, requestId],
  );

  return { detail, error, busy, reload, run };
}
