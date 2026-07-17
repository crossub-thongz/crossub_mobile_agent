import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import { INSPECTION_STATUS } from '@/constants/api-enums';
import { isInspectionDone } from '@/lib/inspections/presentation';
import { isDeletedInspection } from '@/lib/open-inspection-delete';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';

/** Agent-facing ingoing gate: Pending → Scheduled → Completed */
export type AgentIngoingGateStatus = 'pending' | 'scheduled' | 'completed';

export const AGENT_INGOING_GATE_LABEL: Record<AgentIngoingGateStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  completed: 'Completed',
};

const PENDING_INSPECTOR_LABELS = new Set([
  '',
  'unassigned',
  'pending assignment',
  'task pool',
]);

function inspectorIsAssigned(name: string | null | undefined): boolean {
  const normalized = (name ?? '').trim().toLowerCase();
  return Boolean(normalized) && !PENDING_INSPECTOR_LABELS.has(normalized);
}

export function deriveAgentIngoingGateStatus(args: {
  inspection: Inspection;
  record: InspectionRecord | null;
}): AgentIngoingGateStatus {
  const { inspection, record } = args;
  const apiStatus = (record?.status ?? inspection.apiStatus ?? '').toUpperCase();

  if (
    apiStatus === INSPECTION_RECORD_STATUS.COMPLETED ||
    apiStatus === INSPECTION_RECORD_STATUS.PUBLISHED ||
    apiStatus === INSPECTION_STATUS.COMPLETED ||
    apiStatus === INSPECTION_STATUS.PUBLISHED
  ) {
    return 'completed';
  }

  const scheduledAt = record?.scheduledDate ?? inspection.scheduledAt ?? null;
  const inspector =
    record?.inspectorName ?? record?.assignedInspectorId ?? inspection.inspector ?? null;

  if (scheduledAt && inspectorIsAssigned(typeof inspector === 'string' ? inspector : null)) {
    return 'scheduled';
  }
  if (record?.assignedInspectorId && scheduledAt) {
    return 'scheduled';
  }

  return 'pending';
}

export function canCancelIngoingInspection(
  inspection: Inspection,
  record: InspectionRecord | null,
): boolean {
  if (inspection.type !== 'INGOING') return false;
  if (isDeletedInspection(inspection)) return false;
  if (deriveAgentIngoingGateStatus({ inspection, record }) === 'completed') return false;
  if (isInspectionDone(inspection) && !isDeletedInspection(inspection)) return false;
  return Boolean(inspection.propertyId);
}
