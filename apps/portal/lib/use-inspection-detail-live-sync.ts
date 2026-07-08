'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchInspectionDetail } from '@/lib/inspections/fetch';
import type { InspectionDetail } from '@/lib/inspections-types';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import type { Inspection } from '@/lib/types';
import { useLivePoll } from '@/lib/use-live-poll';

function isOpenSession(
  detail: InspectionDetail | OpenInspectionSession,
): detail is OpenInspectionSession {
  return 'sessionStatus' in detail;
}

function mergeInspectionDetail(base: Inspection, detail: InspectionDetail | OpenInspectionSession): Inspection {
  if (isOpenSession(detail)) {
    return {
      ...base,
      scheduledAt: detail.startTime,
      status: detail.sessionStatus,
      visitorCount: detail.visitors.length,
      inspector: detail.agent?.name,
    };
  }
  return {
    ...base,
    inspector: detail.inspectorName ?? base.inspector,
    scheduledAt: detail.scheduledDate ?? detail.inspectionDate ?? base.scheduledAt,
    reportUrl: detail.reportUrl ?? base.reportUrl,
    areaOutcomes: detail.areas.map((area) => ({
      area: area.name ?? 'Area',
      outcome: area.rating,
    })),
  };
}

/** Poll full inspection / open-viewing detail every 5 seconds (ingoing, outgoing, routine, open). */
export function useInspectionDetailLiveSync(
  base: Inspection | null | undefined,
  apiConnected: boolean,
): Inspection | null | undefined {
  const [live, setLive] = useState<Inspection | null | undefined>(base);

  useEffect(() => {
    setLive(base);
  }, [base]);

  const sync = useCallback(async () => {
    if (!apiConnected || !base) {
      setLive(base);
      return;
    }
    const detail = await fetchInspectionDetail(base);
    if (!detail) return;
    setLive((prev) => mergeInspectionDetail(prev ?? base, detail));
  }, [apiConnected, base]);

  useLivePoll(sync, apiConnected && Boolean(base));

  return live ?? base;
}
