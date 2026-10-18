'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  fetchAgentInspectionDetail,
  type AgentInspectionDetail,
} from '@/lib/crossub-api/agent-inspection-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export type SelfManagedInspectionRun = (
  action: () => Promise<AgentInspectionDetail>,
  successMessage: string,
) => Promise<boolean>;

/**
 * One inspection's detail for the Self-Manage action panel, and a runner for its actions: each
 * action returns the refreshed detail, which replaces the one on screen. The runner toasts the
 * outcome and reports whether it worked, so a form can clear itself only on success.
 */
export function useSelfManagedInspection(inspectionId: string, onChanged?: () => void) {
  const [detail, setDetail] = useState<AgentInspectionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadToken, setLoadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setError(null);
    fetchAgentInspectionDetail(inspectionId)
      .then((next) => {
        if (!controller.signal.aborted) setDetail(next);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(apiErrorMessage(err));
      });
    return () => controller.abort();
  }, [inspectionId, loadToken]);

  const reload = useCallback(() => setLoadToken((n) => n + 1), []);

  const run = useCallback<SelfManagedInspectionRun>(
    async (action, successMessage) => {
      setBusy(true);
      try {
        setDetail(await action());
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
    [onChanged],
  );

  return { detail, error, busy, reload, run };
}
