'use client';

import { useEffect } from 'react';

import { CROS_OPEN_PARAM } from '@/constants/web-push';
import { useShellDockStore } from '@/lib/shell-dock-store';

/**
 * Open Cros when the page was reached from an alert that points into it (`?cros=open`, a CROSSUB
 * team reply), then drop the parameter so a reload does not open it again.
 */
export function useCrosOpenParam() {
  const openGii = useShellDockStore((state) => state.openGii);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(CROS_OPEN_PARAM.NAME) !== CROS_OPEN_PARAM.OPEN) return;
    openGii();
    params.delete(CROS_OPEN_PARAM.NAME);
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }, [openGii]);
}
