'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchInspectionDetail } from '@/lib/inspections/fetch';
import {
  mapInspectionRecordToView,
  mapOpenSessionToInspection,
  pickFresherInspection,
} from '@/lib/inspection-mappers';
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
  const mapped = mapInspectionRecordToView(detail);
  return {
    ...base,
    ...mapped,
    propertyAddress:
      (base.propertyAddress && base.propertyAddress !== '—'
        ? base.propertyAddress
        : null) ||
      mapped.propertyAddress,
    areaOutcomes: detail.areas.map((area) => ({
      area: area.name ?? 'Area',
      outcome: area.rating,
    })),
    timeline: base.timeline.length > mapped.timeline.length ? base.timeline : mapped.timeline,
  };
}

/** Keep detail fields enriched by polling when the list row refreshes with sparse data. */
function preserveLiveInspectionFields(base: Inspection, prev: Inspection): Inspection {
  return pickFresherInspection(base, prev);
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
