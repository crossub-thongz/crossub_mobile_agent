import { cancelAgentOutgoingInspection } from '@/lib/crossub-api/agent-workflow-client';
import { canCancelOutgoingInspection } from '@/lib/outgoing-inspection-display';
import type { Inspection } from '@/lib/types';

export { canCancelOutgoingInspection };

export async function cancelOutgoingInspectionJob(
  inspection: Inspection,
  reason: string,
): Promise<void> {
  if (!inspection.propertyId) {
    throw new Error('Property is required to cancel this outgoing inspection');
  }
  await cancelAgentOutgoingInspection(inspection.propertyId, inspection.id, { reason });
}
