import { SessionStatusEnum } from '@/constants/open-inspection-ops';
import { INSPECTION_RECORD_TYPE } from '@/constants/inspection-records';
import { mapInspectionRecordToView, mapOpenSessionToInspection } from '@/lib/inspection-mappers';
import { inspectionsApi } from '@/lib/inspections-api';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { LeasingOpenInspection } from '@/lib/leasing/types';
import type { Inspection } from '@/lib/types';

export type ResolveOpenInspectionForCycleInput = {
  propertyId: string;
  cycleId?: string | null;
  inspectionId?: string | null;
  viewingSessionId?: string | null;
};

function sortSessionsNewestFirst<T extends { createdAt?: string; startTime: string }>(
  sessions: T[],
): T[] {
  return [...sessions].sort(
    (a, b) =>
      new Date(b.createdAt ?? b.startTime).getTime() -
      new Date(a.createdAt ?? a.startTime).getTime(),
  );
}

/** Latest OPEN pool inspection record for a property (legacy fallback). */
export async function fetchLatestOpenPoolInspection(
  propertyId: string,
): Promise<Inspection | null> {
  const { inspections } = await inspectionsApi.list({ pageSize: 100 });
  const match = inspections
    .filter((r) => r.type === INSPECTION_RECORD_TYPE.OPEN && r.propertyId === propertyId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return match ? mapInspectionRecordToView(match) : null;
}

/** CROSSUB-managed open still needs agent preferred viewing window. */
export function needsOpenInspectionScheduleRequest(oi: LeasingOpenInspection): boolean {
  return (
    !oi.agentConducted &&
    !oi.scheduledTime &&
    !oi.preferredScheduledTime &&
    !oi.preferredNotes
  );
}

/**
 * Resolve the agent-facing OPEN case for a specific letting cycle.
 * Prefers the viewing session over the inspector pool twin; never falls back to
 * unrelated sessions on the same property.
 */
export async function resolveOpenInspectionForCycle(
  input: ResolveOpenInspectionForCycleInput,
): Promise<Inspection | null> {
  const { propertyId, cycleId, inspectionId, viewingSessionId } = input;

  if (viewingSessionId) {
    try {
      const session = await openViewingsApi.get(viewingSessionId);
      if (session.sessionStatus !== SessionStatusEnum.CANCELLED) {
        return mapOpenSessionToInspection(session, propertyId);
      }
    } catch {
      /* try cycle-scoped lookup */
    }
  }

  if (cycleId) {
    try {
      const sessions = await openViewingsApi.list({ propertyId });
      const forCycle = sortSessionsNewestFirst(
        sessions.filter(
          (session) =>
            session.sessionStatus !== SessionStatusEnum.CANCELLED &&
            session.leasingCycleId === cycleId,
        ),
      )[0];
      if (forCycle) {
        return mapOpenSessionToInspection(forCycle, propertyId);
      }
    } catch {
      /* fall through to pool job */
    }
  }

  if (inspectionId) {
    try {
      const record = await inspectionsApi.get(inspectionId);
      return mapInspectionRecordToView(record);
    } catch {
      return null;
    }
  }

  return null;
}

/** Register the OPEN case in the agent inspections list after leasing / request flows. */
export async function registerOpenInspectionFromCycle(
  input: ResolveOpenInspectionForCycleInput,
  registerInspection: (inspection: Inspection) => void,
): Promise<void> {
  const resolved = await resolveOpenInspectionForCycle(input);
  if (resolved) registerInspection(resolved);
}
