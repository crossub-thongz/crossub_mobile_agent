import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import { INSPECTION_STATUS } from '@/constants/api-enums';
import { isInspectionDone } from '@/lib/inspections/presentation';
import { isDeletedInspection } from '@/lib/open-inspection-delete';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';
import { suggestLeasingIngoingScheduledTime } from '@/lib/leasing/leasing-ingoing-handoff';

/** Agent-facing ingoing gate: Pending → Scheduled → Completed */
export type AgentIngoingGateStatus = 'pending' | 'scheduled' | 'completed';

export const AGENT_INGOING_GATE_STEPS = [
  'pending',
  'scheduled',
  'completed',
] as const satisfies readonly AgentIngoingGateStatus[];

export const AGENT_INGOING_GATE_LABEL: Record<AgentIngoingGateStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  completed: 'Completed',
};

export const AGENT_INGOING_GATE_HINT: Record<AgentIngoingGateStatus, string> = {
  pending:
    'New tenant details and inspector details. Inspection date targets 7 days before move-in until an inspector is assigned or accepts.',
  scheduled:
    'Inspector is on the job. Pay the Level 1 platform fee if prompted, then track key collection, report, key return, and tenant acknowledgement.',
  completed: 'All four post-accept steps are done — this ingoing job case is complete.',
};

export function agentIngoingGateIndex(status: AgentIngoingGateStatus): number {
  return AGENT_INGOING_GATE_STEPS.indexOf(status);
}

const PENDING_INSPECTOR_LABELS = new Set([
  '',
  'unassigned',
  'pending assignment',
  'task pool',
  'pending — task pool',
  'pending - task pool',
]);

export function inspectorIsAssigned(name: string | null | undefined): boolean {
  const normalized = (name ?? '').trim().toLowerCase();
  return Boolean(normalized) && !PENDING_INSPECTOR_LABELS.has(normalized);
}

/** True once the inspector has accepted the job (DRAFT → IN_PROGRESS). */
export function inspectorHasAcceptedJob(
  record: InspectionRecord | null,
  inspection?: Inspection | null,
): boolean {
  const apiStatus = (record?.status ?? inspection?.apiStatus ?? '').toUpperCase();
  if (
    apiStatus === INSPECTION_RECORD_STATUS.IN_PROGRESS ||
    apiStatus === INSPECTION_RECORD_STATUS.FIRST_REVIEW ||
    apiStatus === INSPECTION_RECORD_STATUS.SECOND_REVIEW ||
    apiStatus === INSPECTION_RECORD_STATUS.COMPLETED ||
    apiStatus === INSPECTION_RECORD_STATUS.PUBLISHED ||
    apiStatus === INSPECTION_STATUS.IN_PROGRESS ||
    apiStatus === INSPECTION_STATUS.COMPLETED ||
    apiStatus === INSPECTION_STATUS.PUBLISHED
  ) {
    return true;
  }
  const phase = (record?.workflowPhase ?? '').toLowerCase();
  if (
    phase &&
    phase !== 'pending_acceptance' &&
    phase !== 'overdue_acceptance'
  ) {
    return true;
  }
  return false;
}

/**
 * Pending until an inspector is on the job (pool accept or staff assign).
 * Scheduled after that (field work + 4 completion steps).
 * Completed when all four post-accept steps are done.
 */
export function deriveAgentIngoingGateStatus(args: {
  inspection: Inspection;
  record: InspectionRecord | null;
  stepsComplete?: boolean;
}): AgentIngoingGateStatus {
  const { inspection, record, stepsComplete } = args;
  const apiStatus = (record?.status ?? inspection.apiStatus ?? '').toUpperCase();

  if (stepsComplete) return 'completed';

  if (
    apiStatus === INSPECTION_RECORD_STATUS.COMPLETED ||
    apiStatus === INSPECTION_RECORD_STATUS.PUBLISHED ||
    apiStatus === INSPECTION_STATUS.COMPLETED ||
    apiStatus === INSPECTION_STATUS.PUBLISHED
  ) {
    // Report may be done before tenant ack — stay Scheduled until all 4 steps finish.
    if (stepsComplete === false) return 'scheduled';
    if (stepsComplete === undefined) return 'completed';
  }

  if (inspectorHasAcceptedJob(record, inspection)) return 'scheduled';
  // Staff assign skips accept — once a named inspector is on the job, move past Pending.
  if (
    record?.assignedInspectorId ||
    inspectorIsAssigned(record?.inspectorName ?? inspection.inspector)
  ) {
    return 'scheduled';
  }
  return 'pending';
}

export function canCancelIngoingInspection(
  inspection: Inspection,
  record: InspectionRecord | null,
  stepsComplete?: boolean,
): boolean {
  if (inspection.type !== 'INGOING') return false;
  if (isDeletedInspection(inspection)) return false;
  if (deriveAgentIngoingGateStatus({ inspection, record, stepsComplete }) === 'completed') {
    return false;
  }
  if (isInspectionDone(inspection) && !isDeletedInspection(inspection)) return false;
  return Boolean(inspection.propertyId);
}

/**
 * Display inspection date: live scheduled time, else admin rule of 7 days before
 * move-in (suggested target while still Pending).
 *
 * Uses an early reference date so History still shows the target after the
 * move-in window has passed (suggest otherwise returns null once "today" is
 * past the pre-move-in window).
 */
export function resolveIngoingInspectionDateDisplay(args: {
  scheduledDate?: string | null;
  moveInDate?: string | null;
}): { iso: string | null; isSuggested: boolean } {
  if (args.scheduledDate) {
    return { iso: args.scheduledDate, isSuggested: false };
  }
  if (args.moveInDate) {
    const suggested = suggestLeasingIngoingScheduledTime(
      args.moveInDate,
      new Date(0),
    );
    if (suggested) return { iso: suggested, isSuggested: true };
  }
  return { iso: null, isSuggested: false };
}

/** Human label for inspector field workflow phase / progression. */
export function formatInspectorFieldStatus(args: {
  workflowPhase?: string | null;
  keyCollected?: boolean;
  reportSubmitted?: boolean;
  keyReturned?: boolean;
  tenantAcked?: boolean;
  /** When set, acknowledgement copy uses agent (outgoing) instead of tenant (ingoing). */
  ackParty?: 'tenant' | 'agent';
  accepted?: boolean;
}): string {
  const ackParty = args.ackParty ?? 'tenant';
  const ackNoun = ackParty === 'agent' ? 'Agent' : 'Tenant';
  const ackLower = ackParty === 'agent' ? 'agent' : 'tenant';
  if (args.tenantAcked) return `${ackNoun} acknowledgement complete`;
  if (args.keyReturned) return `Keys returned — awaiting ${ackLower} acknowledgement`;
  if (args.reportSubmitted) return 'Report submitted — awaiting key return';
  if (args.keyCollected) return 'Keys collected — inspection in progress';
  if (args.accepted) return 'Accepted — awaiting key collection';
  const phase = (args.workflowPhase ?? '').toLowerCase().replace(/_/g, ' ');
  if (phase) return phase.charAt(0).toUpperCase() + phase.slice(1);
  return 'Awaiting inspector acceptance';
}
