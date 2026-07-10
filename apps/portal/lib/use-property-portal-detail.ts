'use client';

import { useCallback, useRef, useState } from 'react';

import {
  propertyRegistryApi,
  type PropertyPortalDetail,
} from '@/lib/property-registry-api';
import { useLivePoll } from '@/lib/use-live-poll';

export function usePropertyPortalDetail(propertyId: string, apiConnected: boolean) {
  const [detail, setDetail] = useState<PropertyPortalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const detailRef = useRef<PropertyPortalDetail | null>(null);
  const requestIdRef = useRef(0);

  detailRef.current = detail;

  const sync = useCallback(async () => {
    if (!apiConnected) {
      setDetail(null);
      detailRef.current = null;
      setLoading(false);
      return;
    }

    const isFirstLoad = detailRef.current === null;
    if (isFirstLoad) setLoading(true);

    const requestId = ++requestIdRef.current;
    try {
      const next = await propertyRegistryApi.getPortalDetail(propertyId);
      if (requestId !== requestIdRef.current) return;
      setDetail(next);
    } catch {
      // Keep the last good payload on background refresh errors so the UI doesn't flicker.
      if (detailRef.current === null) setDetail(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [apiConnected, propertyId]);

  useLivePoll(sync, apiConnected);

  return { detail, loading, refresh: sync };
}
