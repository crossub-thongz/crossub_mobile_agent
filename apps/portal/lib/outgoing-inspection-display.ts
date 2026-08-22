import { AGENT_AWAITING_CROSSUB_APPROVAL_LABEL } from '@/constants/inspection-approval';
import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import { INSPECTION_STATUS } from '@/constants/api-enums';
import { awaitsCrossubApproval, furthestInspectionStatus } from '@/lib/inspection-approval';
import {
  inspectorHasAcceptedJob,
  inspectorIsAssigned,
} from '@/lib/ingoing-inspection-display';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';

export { inspectorHasAcceptedJob, formatInspectorFieldStatus } from '@/lib/ingoing-inspection-display';

/** Agent-facing outgoing gate: Pending → Scheduled → Pending approval from CROSSUB → Completed */
export type AgentOutgoingGateStatus =
  | 'pending'
  | 'scheduled'
  | 'awaiting_approval'
  | 'completed';

export const AGENT_OUTGOING_GATE_STEPS = [
  'pending',
  'scheduled',
  'awaiting_approval',
  'completed',
] as const satisfies readonly AgentOutgoingGateStatus[];

export const AGENT_OUTGOING_GATE_LABEL: Record<AgentOutgoingGateStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  awaiting_approval: AGENT_AWAITING_CROSSUB_APPROVAL_LABEL,
  completed: 'Completed',
};

export const AGENT_OUTGOING_GATE_HINT: Record<AgentOutgoingGateStatus, string> = {
  pending:
    'Vacating tenant details and inspector details. Waiting for an inspector to be assigned or accept.',
  scheduled:
    'Inspector is on the job. Pay the Level 1 platform fee if prompted, then track key collection, report, key return, and agent acknowledgement.',
  awaiting_approval:
    'The inspector has submitted the report. CROSSUB is reviewing it before this job is complete.',
  completed:
    'CROSSUB has approved this job and all four post-accept steps are done — this outgoing job case is complete.',
};

export function agentOutgoingGateIndex(status: AgentOutgoingGateStatus): number {
  return AGENT_OUTGOING_GATE_STEPS.indexOf(status);
}

/**
 * Pending until an inspector is on the job (pool accept or staff assign).
 * Scheduled after that (field work + 4 completion steps).
 * Pending approval from CROSSUB once the inspector has finished and the report
 * is waiting for officer sign-off.
 * Completed when CROSSUB has approved and all four post-accept steps are done.
 */
export function deriveAgentOutgoingGateStatus(args: {
  inspection: Inspection;
  record: InspectionRecord | null;
  stepsComplete?: boolean;
  progressionStatus?: string | null;
}): AgentOutgoingGateStatus {
  const { inspection, record, stepsComplete, progressionStatus } = args;
  const apiStatus = furthestInspectionStatus(
    record?.status,
    inspection.apiStatus,
    progressionStatus,
  );
  const effectiveRecord =
    record && apiStatus
      ? { ...record, status: apiStatus as InspectionRecord['status'] }
      : record;
  const effectiveInspection = apiStatus
    ? { ...inspection, apiStatus }
    : inspection;

  if (
    awaitsCrossubApproval({
      status: apiStatus,
      completedAt: record?.completedDate ?? inspection.completedAt,
      approvedAt: record?.approvedAt ?? inspection.approvedAt,
      createdAt: record?.createdAt ?? inspection.createdAt,
    })
  ) {
    return 'awaiting_approval';
  }

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

  if (inspectorHasAcceptedJob(effectiveRecord, effectiveInspection)) return 'scheduled';
  if (
    record?.assignedInspectorId ||
    inspectorIsAssigned(record?.inspectorName ?? inspection.inspector)
  ) {
    return 'scheduled';
  }
  return 'pending';
}
