import { SessionStatusEnum } from '@/constants/open-inspection-ops';
import { INSPECTION_RECORD_TYPE } from '@/constants/inspection-records';
import { mapInspectionRecordToView, mapOpenSessionToInspection } from '@/lib/inspection-mappers';
import { inspectionsApi } from '@/lib/inspections-api';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { LeasingOpenInspection } from '@/lib/leasing/types';
import type { Inspection } from '@/lib/types';

/** Latest OPEN pool inspection record for a property (no viewing session yet). */
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

/** Register the OPEN case in the agent inspections list after leasing / request flows. */
export async function registerOpenInspectionFromCycle(
  propertyId: string,
  inspectionId: string | null | undefined,
  registerInspection: (inspection: Inspection) => void,
): Promise<void> {
  try {
    const sessions = await openViewingsApi.list({ propertyId });
    const latest = [...sessions]
      .filter((s) => s.sessionStatus !== SessionStatusEnum.CANCELLED)
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? b.startTime).getTime() -
          new Date(a.createdAt ?? a.startTime).getTime(),
      )[0];
    if (latest) {
      registerInspection(mapOpenSessionToInspection(latest, propertyId));
      return;
    }
  } catch {
    /* fall through to pool inspection */
  }

  if (inspectionId) {
    try {
      const record = await inspectionsApi.get(inspectionId);
      registerInspection(mapInspectionRecordToView(record));
      return;
    } catch {
      /* fall through */
    }
  }

  const pooled = await fetchLatestOpenPoolInspection(propertyId);
  if (pooled) registerInspection(pooled);
}
