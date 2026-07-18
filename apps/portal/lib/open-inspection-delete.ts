import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import { SessionStatusEnum } from '@/constants/open-inspection-ops';
import { cancelAgentOpenInspection } from '@/lib/crossub-api/agent-workflow-client';
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

/** Open inspection job cases the agent may delete (including completed ones). */
export function canDeleteOpenInspection(inspection: Inspection): boolean {
  if (inspection.type !== 'OPEN') return false;
  if (isDeletedInspection(inspection)) return false;
  return (
    inspection.source === 'open_viewing' ||
    inspection.source === 'inspection' ||
    inspection.source == null
  );
}

export async function cancelOpenInspectionJob(
  inspection: Inspection,
  reason: string,
): Promise<void> {
  if (inspection.source === 'open_viewing') {
    // force: CLOSED (report-complete) sessions need archive-cancel, not a lifecycle skip.
    await openViewingsApi.cancel(inspection.id, reason, { force: true });
    return;
  }
  if (!inspection.propertyId) {
    throw new Error('Property is required to delete this open inspection');
  }
  await cancelAgentOpenInspection(inspection.propertyId, inspection.id, { reason });
}
