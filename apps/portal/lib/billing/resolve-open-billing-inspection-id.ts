import { INSPECTION_RECORD_TYPE } from '@/constants/inspection-records';
import { inspectionsApi } from '@/lib/inspections-api';
import { openViewingsApi } from '@/lib/open-viewings-api';

async function poolIdFromViewingSession(
  sessionId: string,
  propertyId?: string,
): Promise<string | null> {
  try {
    const session = await openViewingsApi.get(sessionId);
    const linked = session.inspectionId?.trim();
    if (linked) return linked;
  } catch {
    /* fall through to list lookup */
  }

  if (propertyId) {
    try {
      const sessions = await openViewingsApi.list({ propertyId, pageSize: 100 });
      const match = sessions.find((row) => row.id === sessionId);
      const linked = match?.inspectionId?.trim();
      if (linked) return linked;
    } catch {
      /* ignore */
    }
  }

  return null;
}

/** Pool inspection row id for billing — never the open-viewing session id. */
export async function resolveOpenBillingInspectionId(args: {
  inspectionId: string;
  propertyId?: string;
  viewingSessionId?: string;
}): Promise<string> {
  const initial = args.inspectionId.trim();
  if (!initial) return initial;

  const sessionId = args.viewingSessionId?.trim() ?? initial;

  const linkedFromSession = await poolIdFromViewingSession(sessionId, args.propertyId);
  if (linkedFromSession) return linkedFromSession;

  if (initial !== sessionId) {
    const linkedInitial = await poolIdFromViewingSession(initial, args.propertyId);
    if (linkedInitial) return linkedInitial;
  }

  if (initial !== sessionId) {
    try {
      const record = await inspectionsApi.get(initial);
      if (record?.type === INSPECTION_RECORD_TYPE.OPEN && record.id?.trim()) {
        return record.id.trim();
      }
    } catch {
      /* not a pool row id */
    }
  }

  return initial;
}
