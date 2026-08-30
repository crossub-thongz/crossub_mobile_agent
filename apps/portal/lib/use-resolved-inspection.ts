'use client';

import { useEffect, useRef, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  findInspectionInList,
  mapInspectionRecordToView,
  mapOpenSessionToInspection,
} from '@/lib/inspection-mappers';
import { inspectionsApi } from '@/lib/inspections-api';
import { isDeletedInspection } from '@/lib/open-inspection-delete';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { Inspection } from '@/lib/types';

export type ResolvedInspectionState = 'pending' | 'ready' | 'missing';

/**
 * Resolve an inspection for a detail URL. Newly created OPEN jobs are often
 * missing from the portfolio snapshot (viewing session vs pool twin), so the
 * page must fetch by id instead of 404ing.
 */
export function useResolvedInspection(inspectionId: string): {
  inspection: Inspection | null;
  resolveState: ResolvedInspectionState;
} {
  const { inspections, apiConnected, registerInspection } = useAgentData();
  const fromList = findInspectionInList(inspections, inspectionId);
  const fromListRef = useRef(fromList);
  fromListRef.current = fromList;
  const [fetched, setFetched] = useState<Inspection | null>(null);
  const [resolveState, setResolveState] = useState<ResolvedInspectionState>(
    fromList ? 'ready' : 'pending',
  );

  useEffect(() => {
    const listed = fromListRef.current;
    if (listed?.source === 'open_viewing' || (listed && isDeletedInspection(listed))) {
      setFetched(null);
      setResolveState('ready');
      return;
    }

    if (!apiConnected) {
      setResolveState(listed ? 'ready' : 'missing');
      return;
    }

    let cancelled = false;
    setResolveState(listed ? 'ready' : 'pending');

    void inspectionsApi
      .get(inspectionId)
      .then((record) => {
        if (cancelled) return;
        const mapped = mapInspectionRecordToView(record);
        registerInspection(mapped);
        setFetched(mapped);
        setResolveState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        if (listed) return;
        return openViewingsApi
          .get(inspectionId)
          .then((session) => {
            if (cancelled) return;
            const mapped = mapOpenSessionToInspection(session);
            registerInspection(mapped);
            setFetched(mapped);
            setResolveState('ready');
          })
          .catch(() => {
            if (cancelled) return;
            setResolveState('missing');
          });
      });

    return () => {
      cancelled = true;
    };
  }, [apiConnected, inspectionId, registerInspection]);

  const inspection = fromList ?? fetched;

  return {
    inspection,
    resolveState: inspection ? 'ready' : resolveState,
  };
}
