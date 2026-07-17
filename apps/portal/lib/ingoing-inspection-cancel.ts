import { cancelAgentIngoingInspection } from '@/lib/crossub-api/agent-workflow-client';
import { canCancelIngoingInspection } from '@/lib/ingoing-inspection-display';
import type { Inspection } from '@/lib/types';

export { canCancelIngoingInspection };

export async function cancelIngoingInspectionJob(
  inspection: Inspection,
  reason: string,
): Promise<void> {
  if (!inspection.propertyId) {
    throw new Error('Property is required to cancel this ingoing inspection');
  }
  await cancelAgentIngoingInspection(inspection.propertyId, inspection.id, { reason });
}
