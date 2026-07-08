'use client';

import { useCallback } from 'react';

import { useVacatingWorkflowStore } from '@/lib/vacating/store';
import { useLivePoll } from '@/lib/use-live-poll';
import type { Inspection, VacatingCase } from '@/lib/types';

/** Keep the end-leasing workflow store aligned with the live vacating case snapshot. */
export function useVacatingCaseLiveSync(
  vacatingCase: VacatingCase | null | undefined,
  outgoingInspection?: Inspection,
  enabled = true,
): void {
  const ensureDetail = useVacatingWorkflowStore((s) => s.ensureDetail);

  const sync = useCallback(() => {
    if (!vacatingCase) return;
    ensureDetail(vacatingCase, outgoingInspection);
  }, [ensureDetail, vacatingCase, outgoingInspection]);

  useLivePoll(sync, enabled && Boolean(vacatingCase));
}
