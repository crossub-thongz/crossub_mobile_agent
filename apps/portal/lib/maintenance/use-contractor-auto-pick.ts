'use client';

import { useCallback, useEffect, useRef } from 'react';

import { topMaintenanceContractorIds } from '@/lib/maintenance/maintenance-contractor-list.constants';

/**
 * Pre-select the top ranked contractors once per case. Stops re-applying after the
 * user changes selection (including unticking all).
 */
export function useContractorAutoPick(opts: {
  enabled: boolean;
  contractors: Array<{ id: string }>;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  resetKey: string | null | undefined;
}) {
  const { enabled, contractors, selectedIds, onChangeSelectedIds, resetKey } = opts;
  const touchedRef = useRef(false);

  useEffect(() => {
    touchedRef.current = false;
  }, [resetKey]);

  useEffect(() => {
    if (!enabled) return;
    if (touchedRef.current) return;
    if (selectedIds.length > 0) return;
    const autoIds = topMaintenanceContractorIds(contractors);
    if (autoIds.length === 0) return;
    onChangeSelectedIds(autoIds);
  }, [contractors, enabled, onChangeSelectedIds, selectedIds.length]);

  const markSelectionTouched = useCallback(() => {
    touchedRef.current = true;
  }, []);

  return { markSelectionTouched };
}
