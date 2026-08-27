'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchInspectionDetail } from '@/lib/inspections/fetch';
import {
  inspectionIdentityKey,
  mapInspectionRecordToView,
  mapOpenSessionToInspection,
  pickFresherInspection,
} from '@/lib/inspection-mappers';
import type { InspectionDetail } from '@/lib/inspections-types';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { isDeletedInspection } from '@/lib/open-inspection-delete';
import type { Inspection } from '@/lib/types';
import { useLivePoll } from '@/lib/use-live-poll';

function isOpenSession(
  detail: InspectionDetail | OpenInspectionSession,
): detail is OpenInspectionSession {
  return 'sessionStatus' in detail;
}

function mergeInspectionDetail(base: Inspection, detail: InspectionDetail | OpenInspectionSession): Inspection {
  if (isDeletedInspection(base)) return base;
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
  const baseRef = useRef(base);
  baseRef.current = base;
  const baseKey = base ? inspectionIdentityKey(base) : '';
  const deleted = Boolean(base && isDeletedInspection(base));

  useEffect(() => {
    const next = baseRef.current;
    setLive((prev) => {
      if (!next) return next;
      if (!prev || prev.id !== next.id) return next;
      const merged = preserveLiveInspectionFields(next, prev);
      return inspectionIdentityKey(merged) === inspectionIdentityKey(prev) ? prev : merged;
    });
  }, [baseKey]);

  const sync = useCallback(async () => {
    const current = baseRef.current;
    if (!apiConnected || !current || isDeletedInspection(current)) {
      setLive((prev) => {
        if (!current) return current;
        if (!prev || prev.id !== current.id) return current;
        return inspectionIdentityKey(prev) === inspectionIdentityKey(current) ? prev : current;
      });
      return;
    }
    const detail = await fetchInspectionDetail(current);
    if (!detail) return;
    setLive((prev) => {
      const seed = prev && prev.id === current.id ? prev : current;
      const merged = mergeInspectionDetail(seed, detail);
      return inspectionIdentityKey(merged) === inspectionIdentityKey(seed) ? seed : merged;
    });
  }, [apiConnected]);

  useLivePoll(sync, apiConnected && Boolean(base) && !deleted);

  return live ?? base;
}
