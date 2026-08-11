import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import { INSPECTION_STATUS } from '@/constants/api-enums';
import {
  inspectorHasAcceptedJob,
  inspectorIsAssigned,
} from '@/lib/ingoing-inspection-display';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';

export { inspectorHasAcceptedJob, formatInspectorFieldStatus } from '@/lib/ingoing-inspection-display';

/** Agent-facing outgoing gate: Pending → Scheduled → Completed */
export type AgentOutgoingGateStatus = 'pending' | 'scheduled' | 'completed';

export const AGENT_OUTGOING_GATE_STEPS = [
  'pending',
  'scheduled',
  'completed',
] as const satisfies readonly AgentOutgoingGateStatus[];

export const AGENT_OUTGOING_GATE_LABEL: Record<AgentOutgoingGateStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  completed: 'Completed',
};

export const AGENT_OUTGOING_GATE_HINT: Record<AgentOutgoingGateStatus, string> = {
  pending:
    'Vacating tenant details and inspector details. Waiting for an inspector to be assigned or accept.',
  scheduled:
    'Inspector is on the job. Pay the Level 1 platform fee if prompted, then track key collection, report, key return, and agent acknowledgement.',
  completed: 'All four post-accept steps are done — this outgoing job case is complete.',
};

export function agentOutgoingGateIndex(status: AgentOutgoingGateStatus): number {
  return AGENT_OUTGOING_GATE_STEPS.indexOf(status);
}

/**
 * Pending until an inspector is on the job (pool accept or staff assign).
 * Scheduled after that (field work + 4 completion steps).
 * Completed when all four post-accept steps are done.
 */
export function deriveAgentOutgoingGateStatus(args: {
  inspection: Inspection;
  record: InspectionRecord | null;
  stepsComplete?: boolean;
}): AgentOutgoingGateStatus {
  const { inspection, record, stepsComplete } = args;
  const apiStatus = (record?.status ?? inspection.apiStatus ?? '').toUpperCase();

  if (stepsComplete) return 'completed';

  if (
    apiStatus === INSPECTION_RECORD_STATUS.COMPLETED ||
    apiStatus === INSPECTION_RECORD_STATUS.PUBLISHED ||
    apiStatus === INSPECTION_STATUS.COMPLETED ||
    apiStatus === INSPECTION_STATUS.PUBLISHED
  ) {
    // Report may be done before agent ack — stay Scheduled until all 4 steps finish.
    if (stepsComplete === false) return 'scheduled';
    if (stepsComplete === undefined) return 'completed';
  }

  if (inspectorHasAcceptedJob(record, inspection)) return 'scheduled';
  if (
    record?.assignedInspectorId ||
    inspectorIsAssigned(record?.inspectorName ?? inspection.inspector)
  ) {
    return 'scheduled';
  }
  return 'pending';
}
