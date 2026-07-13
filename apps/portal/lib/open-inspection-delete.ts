import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import { SessionStatusEnum } from '@/constants/open-inspection-ops';
import { cancelAgentOpenInspection } from '@/lib/crossub-api/agent-workflow-client';
import { isInspectionDone } from '@/lib/inspections/presentation';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { Inspection } from '@/lib/types';

export function isDeletedInspection(inspection: Inspection): boolean {
  const raw = (inspection.apiStatus ?? inspection.status).toLowerCase();
  return (
    raw === SessionStatusEnum.CANCELLED ||
    raw === INSPECTION_RECORD_STATUS.CANCELLED.toLowerCase() ||
    inspection.status.toLowerCase() === 'deleted'
  );
}

/** Active open inspection job cases the agent may delete (cancel). */
export function canDeleteOpenInspection(inspection: Inspection): boolean {
  if (inspection.type !== 'OPEN') return false;
  if (isInspectionDone(inspection) && !isDeletedInspection(inspection)) return false;
  if (isDeletedInspection(inspection)) return false;

  if (inspection.source === 'open_viewing') {
    const status = (inspection.apiStatus ?? '').toLowerCase();
    if (status === SessionStatusEnum.CLOSED) return false;
    return true;
  }

  return inspection.source === 'inspection' || inspection.source == null;
}

export async function cancelOpenInspectionJob(
  inspection: Inspection,
  reason: string,
): Promise<void> {
  if (inspection.source === 'open_viewing') {
    await openViewingsApi.cancel(inspection.id, reason);
    return;
  }
  if (!inspection.propertyId) {
    throw new Error('Property is required to delete this open inspection');
  }
  await cancelAgentOpenInspection(inspection.propertyId, inspection.id, { reason });
}
