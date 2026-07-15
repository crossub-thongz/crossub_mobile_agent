'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchInspectionDetail } from '@/lib/inspections/fetch';
import { mapOpenSessionToInspection } from '@/lib/inspection-mappers';
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
    const mapped = mapOpenSessionToInspection(detail, base.propertyId);
    return {
      ...base,
      ...mapped,
      propertyAddress: base.propertyAddress || mapped.propertyAddress,
      timeline: base.timeline.length > mapped.timeline.length ? base.timeline : mapped.timeline,
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

/** Keep detail fields enriched by polling when the list row refreshes with sparse data. */
function preserveLiveInspectionFields(base: Inspection, prev: Inspection): Inspection {
  return {
    ...base,
    scheduledAt: base.scheduledAt ?? prev.scheduledAt,
    inspector: base.inspector ?? prev.inspector,
    reportUrl: base.reportUrl ?? prev.reportUrl,
    visitorCount: base.visitorCount ?? prev.visitorCount,
    areaOutcomes: prev.areaOutcomes?.length ? prev.areaOutcomes : base.areaOutcomes,
    timeline: prev.timeline.length > base.timeline.length ? prev.timeline : base.timeline,
  };
}

/** Poll full inspection / open-viewing detail every 5 seconds (ingoing, outgoing, routine, open). */
export function useInspectionDetailLiveSync(
  base: Inspection | null | undefined,
  apiConnected: boolean,
): Inspection | null | undefined {
  const [live, setLive] = useState<Inspection | null | undefined>(base);

  useEffect(() => {
    setLive((prev) => {
      if (!base) return base;
      if (!prev || prev.id !== base.id) return base;
      return preserveLiveInspectionFields(base, prev);
    });
  }, [base]);

  const sync = useCallback(async () => {
    if (!apiConnected || !base) {
      setLive(base);
      return;
    }
    const detail = await fetchInspectionDetail(base);
    if (!detail) return;
    setLive((prev) => {
      const seed = prev && prev.id === base.id ? prev : base;
      return mergeInspectionDetail(seed, detail);
    });
  }, [apiConnected, base]);

  useLivePoll(sync, apiConnected && Boolean(base));

  return live ?? base;
}
