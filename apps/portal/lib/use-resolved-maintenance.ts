'use client';

import { useEffect, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { fetchMaintenanceCase } from '@/lib/maintenance/fetch-maintenance-case';
import type { MaintenanceRequest } from '@/lib/types';

export function useResolvedMaintenance(caseId: string): {
  item: MaintenanceRequest | undefined;
  resolveState: 'pending' | 'ready' | 'missing';
} {
  const { maintenanceAll, apiConnected, loading } = useAgentData();
  const fromList = maintenanceAll.find((row) => row.id === caseId);
  const [fetched, setFetched] = useState<MaintenanceRequest | null>(null);
  const [resolveState, setResolveState] = useState<'pending' | 'ready' | 'missing'>(
    fromList || loading ? (fromList ? 'ready' : 'pending') : 'pending',
  );

  useEffect(() => {
    if (fromList) {
      setResolveState('ready');
      return;
    }
    if (loading) {
      setResolveState('pending');
      return;
    }
    if (!apiConnected) {
      setResolveState('missing');
      return;
    }

    let cancelled = false;
    setResolveState('pending');
    void fetchMaintenanceCase(caseId)
      .then((snapshot) => {
        if (cancelled) return;
        if (snapshot) setFetched(snapshot.mapped);
        setResolveState(snapshot ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setResolveState('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [apiConnected, caseId, fromList, loading]);

  const item = fromList ?? fetched ?? undefined;
  return {
    item,
    resolveState: item ? 'ready' : resolveState,
  };
}
