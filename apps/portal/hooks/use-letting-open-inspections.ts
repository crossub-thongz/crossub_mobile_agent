'use client';

import { useCallback, useState } from 'react';

import { LETTING_OPEN_POLL_MS } from '@/constants/self-managed-open-inspections';
import {
  listLettingOpenInspections,
  type LettingOpenInspections,
} from '@/lib/crossub-api/agent-letting-open-client';
import { useLivePoll } from '@/lib/use-live-poll';

/** The opens on a Self-Manage letting, kept fresh while on screen. Writes hand back the list. */
export function useLettingOpenInspections(
  propertyId: string,
  cycleId: string | undefined,
  enabled: boolean,
): {
  data: LettingOpenInspections | null;
  error: string | null;
  setData: (data: LettingOpenInspections) => void;
  reload: () => Promise<void>;
} {
  const [data, setData] = useState<LettingOpenInspections | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!cycleId) return;
    try {
      setData(await listLettingOpenInspections(propertyId, cycleId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [propertyId, cycleId]);

  useLivePoll(reload, enabled && Boolean(cycleId), { intervalMs: LETTING_OPEN_POLL_MS });

  return { data, error, setData, reload };
}
