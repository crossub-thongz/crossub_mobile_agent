'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

/** Load viewing session + pool inspection rows for open-case email history. */
export function useOpenInspectionEmailSources(args: {
  enabled: boolean;
  apiConnected: boolean;
  leasingDetail?: LeasingPropertyDetail | null;
  focusInspectionId?: string | null;
  isViewingSessionSource?: boolean;
  poll?: boolean;
}) {
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);
  const [poolInspectionRecord, setPoolInspectionRecord] = useState<InspectionRecord | null>(null);
  const [resolvedPoolInspectionId, setResolvedPoolInspectionId] = useState<string | null>(null);

  const openSessionId = useMemo(() => {
    if (!args.enabled) return null;
    const fromLeasing = args.leasingDetail?.openInspection?.viewingSessionId?.trim();
    if (fromLeasing) return fromLeasing;
    if (args.isViewingSessionSource && args.focusInspectionId) {
      return args.focusInspectionId;
    }
    return null;
  }, [
    args.enabled,
    args.focusInspectionId,
    args.isViewingSessionSource,
    args.leasingDetail?.openInspection?.viewingSessionId,
  ]);

  const poolInspectionId = useMemo(() => {
    if (!args.enabled) return null;
    return (
      resolvedPoolInspectionId ??
      resolveOpenPoolInspectionId({
        leasingDetail: args.leasingDetail,
        openSession,
        focusInspectionId: args.focusInspectionId,
        isViewingSessionSource: args.isViewingSessionSource,
      })
    );
  }, [
    args.enabled,
    args.focusInspectionId,
    args.isViewingSessionSource,
    args.leasingDetail,
    openSession,
    resolvedPoolInspectionId,
  ]);

  const syncAll = useCallback(async () => {
    if (!args.enabled) {
      setOpenSession(null);
      setPoolInspectionRecord(null);
      setResolvedPoolInspectionId(null);
      return;
    }

    let session: OpenInspectionSession | null = null;
    if (args.apiConnected && openSessionId) {
      try {
        session = await openViewingsApi.get(openSessionId);
        setOpenSession((previous) => mergeOpenInspectionSessionPoll(previous, session!));
      } catch {
        /* keep last good session on transient poll errors */
      }
    } else {
      setOpenSession(null);
    }

    const poolId = args.apiConnected
      ? await resolvePoolInspectionIdForOpenCase({
          leasingDetail: args.leasingDetail,
          openSession: session ?? openSession,
          focusInspectionId: args.focusInspectionId,
          isViewingSessionSource: args.isViewingSessionSource,
        })
      : null;
    setResolvedPoolInspectionId(poolId);

    if (!args.apiConnected || !poolId) {
      setPoolInspectionRecord(null);
      return;
    }

    try {
      const record = await inspectionsApi.get(poolId);
      setPoolInspectionRecord(record);
    } catch {
      /* keep last good record on transient poll errors */
    }
  }, [
    args.apiConnected,
    args.enabled,
    args.focusInspectionId,
    args.isViewingSessionSource,
    args.leasingDetail,
    openSession,
    openSessionId,
  ]);

  useEffect(() => {
    void syncAll();
  }, [syncAll]);

  useLivePoll(syncAll, Boolean(args.poll && args.enabled && args.apiConnected));

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
