'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { resolveOpenBillingInspectionId } from '@/lib/billing/resolve-open-billing-inspection-id';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { inspectionsApi } from '@/lib/inspections-api';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { resolveOpenPoolInspectionId } from '@/lib/open-inspection/linked-case-history';
import { mergeOpenInspectionSessionPoll } from '@/lib/open-inspection-session-sync';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { useLivePoll } from '@/lib/use-live-poll';

async function resolvePoolInspectionIdForOpenCase(args: {
  leasingDetail?: LeasingPropertyDetail | null;
  openSession?: OpenInspectionSession | null;
  focusInspectionId?: string | null;
  isViewingSessionSource?: boolean;
}): Promise<string | null> {
  const direct = resolveOpenPoolInspectionId(args);
  if (direct) return direct;

  const sessionId =
    args.openSession?.id?.trim() ??
    (args.isViewingSessionSource ? args.focusInspectionId?.trim() : null);
  const propertyId = args.openSession?.propertyId ?? args.leasingDetail?.propertyId;
  if (!sessionId) return null;

  const pooled = await resolveOpenBillingInspectionId({
    inspectionId: sessionId,
    propertyId,
    viewingSessionId: sessionId,
  });
  if (!pooled || pooled === sessionId) return null;

  try {
    const record = await inspectionsApi.get(pooled);
    if (record?.id?.trim()) return record.id.trim();
  } catch {
    return pooled;
  }

  return null;
}

function samePoolInspectionRecord(
  previous: InspectionRecord | null,
  next: InspectionRecord | null,
): boolean {
  if (previous === next) return true;
  if (!previous || !next) return false;
  return (
    previous.id === next.id &&
    previous.status === next.status &&
    previous.updatedAt === next.updatedAt
  );
}

/** Load viewing session + pool inspection rows for open-case email history. */
export function useOpenInspectionEmailSources(args: {
  enabled: boolean;
  apiConnected: boolean;
  leasingDetail?: LeasingPropertyDetail | null;
  focusInspectionId?: string | null;
  isViewingSessionSource?: boolean;
  poll?: boolean;
}) {
  const { enabled, apiConnected, focusInspectionId, isViewingSessionSource, poll } = args;
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);
  const [poolInspectionRecord, setPoolInspectionRecord] = useState<InspectionRecord | null>(null);
  const [resolvedPoolInspectionId, setResolvedPoolInspectionId] = useState<string | null>(null);

  const leasingDetailRef = useRef(args.leasingDetail);
  leasingDetailRef.current = args.leasingDetail;
  const openSessionRef = useRef(openSession);
  openSessionRef.current = openSession;

  const openSessionId = useMemo(() => {
    if (!enabled) return null;
    const fromLeasing = args.leasingDetail?.openInspection?.viewingSessionId?.trim();
    if (fromLeasing) return fromLeasing;
    if (isViewingSessionSource && focusInspectionId) {
      return focusInspectionId;
    }
    return null;
  }, [
    enabled,
    focusInspectionId,
    isViewingSessionSource,
    args.leasingDetail?.openInspection?.viewingSessionId,
  ]);

  const poolInspectionId = useMemo(() => {
    if (!enabled) return null;
    return (
      resolvedPoolInspectionId ??
      resolveOpenPoolInspectionId({
        leasingDetail: args.leasingDetail,
        openSession,
        focusInspectionId,
        isViewingSessionSource,
      })
    );
  }, [
    enabled,
    focusInspectionId,
    isViewingSessionSource,
    args.leasingDetail,
    openSession,
    resolvedPoolInspectionId,
  ]);

  const syncAll = useCallback(async () => {
    if (!enabled) {
      setOpenSession((prev) => (prev === null ? prev : null));
      setPoolInspectionRecord((prev) => (prev === null ? prev : null));
      setResolvedPoolInspectionId((prev) => (prev === null ? prev : null));
      return;
    }

    let session: OpenInspectionSession | null = null;
    if (apiConnected && openSessionId) {
      try {
        session = await openViewingsApi.get(openSessionId);
        setOpenSession((previous) => mergeOpenInspectionSessionPoll(previous, session!));
      } catch {
        /* keep last good session on transient poll errors */
      }
    } else {
      setOpenSession((prev) => (prev === null ? prev : null));
    }

    const poolId = apiConnected
      ? await resolvePoolInspectionIdForOpenCase({
          leasingDetail: leasingDetailRef.current,
          openSession: session ?? openSessionRef.current,
          focusInspectionId,
          isViewingSessionSource,
        })
      : null;
    setResolvedPoolInspectionId((prev) => (prev === poolId ? prev : poolId));

    if (!apiConnected || !poolId) {
      setPoolInspectionRecord((prev) => (prev === null ? prev : null));
      return;
    }

    try {
      const record = await inspectionsApi.get(poolId);
      setPoolInspectionRecord((prev) => (samePoolInspectionRecord(prev, record) ? prev : record));
    } catch {
      /* keep last good record on transient poll errors */
    }
  }, [apiConnected, enabled, focusInspectionId, isViewingSessionSource, openSessionId]);

  useEffect(() => {
    void syncAll();
  }, [syncAll]);

  useLivePoll(syncAll, Boolean(poll && enabled && apiConnected), { immediate: false });

  const mergeSessionUpdate = useCallback((session: OpenInspectionSession) => {
    setOpenSession((previous) => mergeOpenInspectionSessionPoll(previous, session));
  }, []);

  return {
    openSession,
    poolInspectionRecord,
    poolInspectionId,
    mergeSessionUpdate,
    refresh: syncAll,
  };
}
