'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SELF_MANAGED_SCREENING_COPY } from '@/constants/self-managed-leasing';
import {
  fetchSelfManagedReferenceCheck,
  recordSelfManagedReferenceCheck,
  summariseSelfManagedReferenceCheck,
  type AgentReferenceCheck,
  type RecordReferenceCheckInput,
} from '@/lib/crossub-api/agent-workflow-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export const REFERENCE_CHECK_ACTION = {
  SAVE: 'save',
  SUMMARISE: 'summarise',
} as const;

export type ReferenceCheckAction =
  (typeof REFERENCE_CHECK_ACTION)[keyof typeof REFERENCE_CHECK_ACTION];

/**
 * The reference check on one Self-Manage applicant: loaded when `enabled` turns on, then
 * saved or summarised through the agent facade. A save drops any Cros summary, because the
 * summary described the notes as they were.
 */
export function useSelfManagedReferenceCheck(
  propertyId: string,
  cycleId: string | undefined,
  applicationId: string,
  enabled: boolean,
) {
  const [check, setCheck] = useState<AgentReferenceCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReferenceCheckAction | null>(null);

  useEffect(() => {
    if (!enabled || !cycleId) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchSelfManagedReferenceCheck(propertyId, cycleId, applicationId)
      .then((result) => {
        if (active) setCheck(result);
      })
      .catch((err: unknown) => {
        if (active) setError(apiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applicationId, cycleId, enabled, propertyId]);

  const save = useCallback(
    async (body: RecordReferenceCheckInput): Promise<boolean> => {
      if (!cycleId) return false;
      setPending(REFERENCE_CHECK_ACTION.SAVE);
      try {
        setCheck(await recordSelfManagedReferenceCheck(propertyId, cycleId, applicationId, body));
        toast.success(SELF_MANAGED_SCREENING_COPY.saved);
        return true;
      } catch (err) {
        toast.error(apiErrorMessage(err));
        return false;
      } finally {
        setPending(null);
      }
    },
    [applicationId, cycleId, propertyId],
  );

  const summarise = useCallback(async (): Promise<void> => {
    if (!cycleId) return;
    setPending(REFERENCE_CHECK_ACTION.SUMMARISE);
    try {
      const result = await summariseSelfManagedReferenceCheck(propertyId, cycleId, applicationId);
      setCheck(result);
      if (result.summaryNotice) toast(result.summaryNotice);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(null);
    }
  }, [applicationId, cycleId, propertyId]);

  return { check, loading, error, pending, save, summarise };
}
