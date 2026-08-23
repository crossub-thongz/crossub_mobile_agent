import { AGENT_AWAITING_CROSSUB_APPROVAL_LABEL } from '@/constants/inspection-approval';
import {
  deriveAgentIngoingGateStatus,
} from '@/lib/ingoing-inspection-display';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';

export { inspectorHasAcceptedJob, formatInspectorFieldStatus } from '@/lib/ingoing-inspection-display';

/** Agent-facing outgoing gate: Pending → Scheduled → Pending Approval → Completed */
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
    'Inspector has accepted the job. Track key collection, the inspection, and key return while they are on site.',
  awaiting_approval:
    'The inspector has submitted the report. CROSSUB is reviewing it before this job is complete.',
  completed:
    'The account manager has approved the inspector report. This job is complete.',
};

export function agentOutgoingGateIndex(status: AgentOutgoingGateStatus): number {
  return AGENT_OUTGOING_GATE_STEPS.indexOf(status);
}

/**
 * Pending until an inspector is on the job (pool accept or staff assign).
 * Scheduled after the inspector accepts.
 * Pending Approval once the inspector has submitted the report.
 * Completed when the account manager approves.
 */
export function deriveAgentOutgoingGateStatus(args: {
  inspection: Inspection;
  record: InspectionRecord | null;
  stepsComplete?: boolean;
  progressionStatus?: string | null;
}): AgentOutgoingGateStatus {
  return deriveAgentIngoingGateStatus(args);
}
