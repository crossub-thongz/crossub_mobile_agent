import { inspectionsApi } from '@/lib/inspections-api';
import { INSPECTION_RECORD_TYPE } from '@/constants/inspection-records';
import { fetchLatestOpenPoolInspection } from '@/lib/open-inspection-resolve';
import { openViewingsApi } from '@/lib/open-viewings-api';

/** Pool inspection row id for billing — never the open-viewing session id. */
export async function resolveOpenBillingInspectionId(args: {
  inspectionId: string;
  propertyId?: string;
  viewingSessionId?: string;
}): Promise<string> {
  const initial = args.inspectionId.trim();
  if (!initial) return initial;

  const fromViewingSession = async (sessionId: string): Promise<string | null> => {
    try {
      const session = await openViewingsApi.get(sessionId);
      return session.inspectionId?.trim() ?? null;
    } catch {
      return null;
    }
  };

  const sessionId = args.viewingSessionId?.trim();
  if (sessionId) {
    const linked = await fromViewingSession(sessionId);
    if (linked) return linked;
  }

  if (sessionId && initial === sessionId) {
    if (args.propertyId) {
      try {
        const { inspections } = await inspectionsApi.list({ pageSize: 100 });
        const linked = inspections
          .filter(
            (row) =>
              row.type === INSPECTION_RECORD_TYPE.OPEN &&
              row.propertyId === args.propertyId &&
              row.status !== 'CANCELLED',
          )
          .sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0];
        if (linked?.id?.trim()) return linked.id.trim();
      } catch {
        /* fall through */
      }

      const pooled = await fetchLatestOpenPoolInspection(args.propertyId);
      const poolId = pooled?.id?.trim();
      if (poolId) return poolId;
    }
    return initial;
  }

  return initial;
}
