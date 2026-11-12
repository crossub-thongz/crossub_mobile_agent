'use client';

import { useCallback, useEffect, useRef } from 'react';

import { topMaintenanceContractorIds } from '@/lib/maintenance/maintenance-contractor-list.constants';

/**
 * Pre-select up to two contractors whose trade matches the job, once per case.
 * Stops re-applying after the user changes the selection, including unticking all.
 */
export function useContractorAutoPick(opts: {
  enabled: boolean;
  contractors: Array<{ id: string; serviceTypes?: readonly string[] }>;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  resetKey: string | null | undefined;
  /** Job issue. Only trades that match this are pre-selected. */
  issueType?: string | null;
}) {
  const { enabled, contractors, selectedIds, onChangeSelectedIds, resetKey, issueType } = opts;
  const touchedRef = useRef(false);

  useEffect(() => {
    touchedRef.current = false;
  }, [resetKey]);

  useEffect(() => {
    if (!enabled) return;
    if (touchedRef.current) return;
    if (selectedIds.length > 0) return;
    const autoIds = topMaintenanceContractorIds(contractors, undefined, issueType);
    if (autoIds.length === 0) return;
    onChangeSelectedIds(autoIds);
  }, [contractors, enabled, issueType, onChangeSelectedIds, selectedIds.length]);

  const markSelectionTouched = useCallback(() => {
    touchedRef.current = true;
  }, []);

  return { markSelectionTouched };
}
