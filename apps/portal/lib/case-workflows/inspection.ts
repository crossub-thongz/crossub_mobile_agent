import { INSPECTION_STATUS } from '@/constants/api-enums';
import { SessionStatusEnum } from '@/constants/open-inspection-ops';
import {
  AGENT_INGOING_GATE_LABEL,
  AGENT_INGOING_GATE_STEPS,
  type AgentIngoingGateStatus,
  deriveAgentIngoingGateStatus,
} from '@/lib/ingoing-inspection-display';
import {
  AGENT_OUTGOING_GATE_LABEL,
  AGENT_OUTGOING_GATE_STEPS,
  type AgentOutgoingGateStatus,
  deriveAgentOutgoingGateStatus,
} from '@/lib/outgoing-inspection-display';
import { INSPECTION_AWAITING_PAYMENT_LABEL } from '@/lib/inspections/awaiting-payment';
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

const OPEN_AGENT_STEPS = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'staff_en_route', label: 'Staff en route' },
  { id: 'open', label: 'Open now' },
  { id: 'completed', label: 'Completed' },
] as const;

const INGOING_AGENT_STEPS = AGENT_INGOING_GATE_STEPS.map((id) => ({
  id,
  label: AGENT_INGOING_GATE_LABEL[id],
}));

const OUTGOING_AGENT_STEPS = AGENT_OUTGOING_GATE_STEPS.map((id) => ({
  id,
  label: AGENT_OUTGOING_GATE_LABEL[id],
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

/** Open-viewing sessions use SessionStatusEnum, not InspectionStatus. */
function resolveOpenInspectionStepId(inspection: Inspection): string {
  const api = (inspection.apiStatus ?? '').toLowerCase();
  if (
    api === SessionStatusEnum.CLOSED ||
    api === INSPECTION_STATUS.COMPLETED.toLowerCase() ||
    api === INSPECTION_STATUS.PUBLISHED.toLowerCase() ||
    inspection.reportStatus === 'sent' ||
    Boolean(inspection.reportUrl)
  ) {
    return 'completed';
  }
  if (api === SessionStatusEnum.OPEN) return 'open';
  if (api === SessionStatusEnum.STAFF_EN_ROUTE) return 'staff_en_route';
  return 'scheduled';
}

/** Pending → Scheduled → Pending Approval → Completed for the agent ingoing job case. */
export function ingoingInspectionWorkflowProgress(
  gateStatus: AgentIngoingGateStatus,
): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    'Ingoing inspection progress',
    INGOING_AGENT_STEPS,
    gateStatus,
  );
}

/** Pending → Scheduled → Pending Approval → Completed for the agent outgoing job case. */
export function outgoingInspectionWorkflowProgress(
  gateStatus: AgentOutgoingGateStatus,
): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    'Outgoing inspection progress',
    OUTGOING_AGENT_STEPS,
    gateStatus,
  );
}

function resolveRoutineInspectionStepId(inspection: Inspection): string {
  const api = inspection.apiStatus;
  if (
    api === INSPECTION_STATUS.COMPLETED ||
    api === INSPECTION_STATUS.PUBLISHED ||
    inspection.reportStatus === 'approved' ||
    inspection.reportStatus === 'sent'
  ) {
    return 'completed';
  }
  return resolveInspectionStepId(api);
}

export function inspectionWorkflowProgress(inspection: Inspection): CaseWorkflowProgress {
  const progress =
    inspection.type === 'INGOING'
      ? ingoingInspectionWorkflowProgress(
          deriveAgentIngoingGateStatus({ inspection, record: null }),
        )
      : inspection.type === 'OUTGOING'
        ? outgoingInspectionWorkflowProgress(
            deriveAgentOutgoingGateStatus({ inspection, record: null }),
          )
        : inspection.type === 'OPEN' || inspection.source === 'open_viewing'
          ? buildCaseWorkflowProgress(
              'Open inspection workflow',
              OPEN_AGENT_STEPS,
              resolveOpenInspectionStepId(inspection),
            )
          : buildCaseWorkflowProgress(
              'Routine inspection workflow',
              INSPECTION_AGENT_STEPS,
              resolveRoutineInspectionStepId(inspection),
            );

  if (inspection.awaitingAgentPayment) {
    return { ...progress, currentStepLabel: INSPECTION_AWAITING_PAYMENT_LABEL };
  }
  return progress;
}
