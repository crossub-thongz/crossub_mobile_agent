import { SessionStatusEnum } from '@/constants/open-inspection-ops';
import { isInspectionDone } from '@/lib/inspections/presentation';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { Inspection } from '@/lib/types';

/** Active open-viewing job cases the agent may delete (cancel). */
export function canDeleteOpenInspection(inspection: Inspection): boolean {
  if (inspection.type !== 'OPEN' || inspection.source !== 'open_viewing') return false;
  if (isInspectionDone(inspection)) return false;

  const status = (inspection.apiStatus ?? '').toLowerCase();
  if (status === SessionStatusEnum.CLOSED) return false;
  if (status === SessionStatusEnum.CANCELLED) return false;

  return true;
}

export async function cancelOpenInspectionJob(
  sessionId: string,
  reason: string,
): Promise<void> {
  await openViewingsApi.cancel(sessionId, reason);
}
