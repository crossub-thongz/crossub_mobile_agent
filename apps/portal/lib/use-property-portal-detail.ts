'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  propertyRegistryApi,
  type PropertyPortalDetail,
} from '@/lib/property-registry-api';
import { useLivePoll } from '@/lib/use-live-poll';

export function usePropertyPortalDetail(propertyId: string, apiConnected: boolean) {
  const [detail, setDetail] = useState<PropertyPortalDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const sync = useCallback(async () => {
    if (!apiConnected) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading((prev) => prev || detail == null);
    try {
      const next = await propertyRegistryApi.getPortalDetail(propertyId);
      setDetail(next);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [apiConnected, detail, propertyId]);

  useEffect(() => {
    void sync();
  }, [sync]);

  useLivePoll(sync, apiConnected);

  return { detail, loading, refresh: sync };
}
