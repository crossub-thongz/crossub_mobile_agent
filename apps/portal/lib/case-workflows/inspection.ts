import { INSPECTION_STATUS } from '@/constants/api-enums';
import {
  AGENT_INGOING_GATE_LABEL,
  AGENT_INGOING_GATE_STEPS,
  type AgentIngoingGateStatus,
  deriveAgentIngoingGateStatus,
} from '@/lib/ingoing-inspection-display';
import type { Inspection } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress } from './types';

const INSPECTION_AGENT_STEPS = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'review', label: 'Report review' },
  { id: 'completed', label: 'Completed' },
  { id: 'published', label: 'Published' },
] as const;

const INGOING_AGENT_STEPS = AGENT_INGOING_GATE_STEPS.map((id) => ({
  id,
  label: AGENT_INGOING_GATE_LABEL[id],
}));

function resolveInspectionStepId(apiStatus?: string): string {
  switch (apiStatus) {
    case INSPECTION_STATUS.DRAFT:
      return 'scheduled';
    case INSPECTION_STATUS.IN_PROGRESS:
      return 'in_progress';
    case INSPECTION_STATUS.FIRST_REVIEW:
    case INSPECTION_STATUS.SECOND_REVIEW:
      return 'review';
    case INSPECTION_STATUS.COMPLETED:
      return 'completed';
    case INSPECTION_STATUS.PUBLISHED:
      return 'published';
    case INSPECTION_STATUS.CANCELLED:
      return 'scheduled';
    default:
      return 'scheduled';
  }
}

/** Pending → Scheduled → Completed for the agent ingoing job case. */
export function ingoingInspectionWorkflowProgress(
  gateStatus: AgentIngoingGateStatus,
): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    'Ingoing inspection progress',
    INGOING_AGENT_STEPS,
    gateStatus,
  );
}

export function inspectionWorkflowProgress(inspection: Inspection): CaseWorkflowProgress {
  if (inspection.type === 'INGOING') {
    return ingoingInspectionWorkflowProgress(
      deriveAgentIngoingGateStatus({ inspection, record: null }),
    );
  }

  const currentStepId = resolveInspectionStepId(inspection.apiStatus);
  const title =
    inspection.type === 'OPEN'
      ? 'Open inspection workflow'
      : inspection.type === 'OUTGOING'
        ? 'Outgoing inspection workflow'
        : 'Routine inspection workflow';

  return buildCaseWorkflowProgress(title, INSPECTION_AGENT_STEPS, currentStepId);
}
