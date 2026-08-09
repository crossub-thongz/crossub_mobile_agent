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
      const pooled = await fetchLatestOpenPoolInspection(args.propertyId);
      const poolId = pooled?.id?.trim();
      if (poolId) return poolId;
    }
    return initial;
  }

  return initial;
}
