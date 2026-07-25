'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { inspectionsApi } from '@/lib/inspections-api';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import {
  resolveOpenPoolInspectionId,
} from '@/lib/open-inspection/linked-case-history';
import { mergeOpenInspectionSessionPoll } from '@/lib/open-inspection-session-sync';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { useLivePoll } from '@/lib/use-live-poll';

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

  const poolInspectionId = useMemo(
    () =>
      args.enabled
        ? resolveOpenPoolInspectionId({
            leasingDetail: args.leasingDetail,
            openSession,
            focusInspectionId: args.focusInspectionId,
            isViewingSessionSource: args.isViewingSessionSource,
          })
        : null,
    [
      args.enabled,
      args.focusInspectionId,
      args.isViewingSessionSource,
      args.leasingDetail,
      openSession,
    ],
  );

  const syncOpenSession = useCallback(async () => {
    if (!args.apiConnected || !openSessionId) {
      setOpenSession(null);
      return;
    }
    try {
      const session = await openViewingsApi.get(openSessionId);
      setOpenSession((previous) => mergeOpenInspectionSessionPoll(previous, session));
    } catch {
      /* keep last good session on transient poll errors */
    }
  }, [args.apiConnected, openSessionId]);

  const syncPoolInspectionRecord = useCallback(async () => {
    if (!args.apiConnected || !poolInspectionId) {
      setPoolInspectionRecord(null);
      return;
    }
    try {
      const record = await inspectionsApi.get(poolInspectionId);
      setPoolInspectionRecord(record);
    } catch {
      /* keep last good record on transient poll errors */
    }
  }, [args.apiConnected, poolInspectionId]);

  const syncAll = useCallback(async () => {
    await Promise.all([syncOpenSession(), syncPoolInspectionRecord()]);
  }, [syncOpenSession, syncPoolInspectionRecord]);

  useEffect(() => {
    if (!args.enabled) {
      setOpenSession(null);
      setPoolInspectionRecord(null);
      return;
    }
    void syncAll();
  }, [args.enabled, syncAll]);

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
