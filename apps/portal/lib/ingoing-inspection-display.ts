import { AGENT_AWAITING_CROSSUB_APPROVAL_LABEL } from '@/constants/inspection-approval';
import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import { INSPECTION_STATUS } from '@/constants/api-enums';
import { awaitsCrossubApproval, furthestInspectionStatus } from '@/lib/inspection-approval';
import { isInspectionDone } from '@/lib/inspections/presentation';
import { isDeletedInspection } from '@/lib/open-inspection-delete';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';
import { suggestLeasingIngoingScheduledTime } from '@/lib/leasing/leasing-ingoing-handoff';

/** Agent-facing ingoing gate: Pending → Scheduled → Pending Approval → Completed */
export type AgentIngoingGateStatus =
  | 'pending'
  | 'scheduled'
  | 'awaiting_approval'
  | 'completed';

export const AGENT_INGOING_GATE_STEPS = [
  'pending',
  'scheduled',
  'awaiting_approval',
  'completed',
] as const satisfies readonly AgentIngoingGateStatus[];

export const AGENT_INGOING_GATE_LABEL: Record<AgentIngoingGateStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  awaiting_approval: AGENT_AWAITING_CROSSUB_APPROVAL_LABEL,
  completed: 'Completed',
};

export const AGENT_INGOING_GATE_HINT: Record<AgentIngoingGateStatus, string> = {
  pending:
    'New tenant details and inspector details. Inspection date targets 7 days before move-in until an inspector is assigned or accepts.',
  scheduled:
    'Inspector has accepted the job. Track key collection, the inspection, and key return while they are on site.',
  awaiting_approval:
    'The inspector has submitted the report. CROSSUB is reviewing it before this job is complete.',
  completed:
    'The account manager has approved the inspector report. This job is complete.',
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
    apiStatus === INSPECTION_STATUS.FIRST_REVIEW ||
    apiStatus === INSPECTION_STATUS.SECOND_REVIEW ||
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
 * Scheduled after the inspector accepts.
 * Pending Approval once the inspector has submitted the report.
 * Completed when the account manager approves.
 */
export function deriveAgentIngoingGateStatus(args: {
  inspection: Inspection;
  record: InspectionRecord | null;
  stepsComplete?: boolean;
  progressionStatus?: string | null;
}): AgentIngoingGateStatus {
  const { inspection, record, progressionStatus } = args;
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

  const approvedAt = record?.approvedAt ?? inspection.approvedAt;
  const reportUrl = record?.reportUrl ?? inspection.reportUrl;
  const status = apiStatus.toUpperCase();

  if (
    approvedAt ||
    status === INSPECTION_RECORD_STATUS.PUBLISHED ||
    status === INSPECTION_STATUS.PUBLISHED
  ) {
    return 'completed';
  }

  const reportSubmitted =
    Boolean(reportUrl?.trim()) ||
    status === INSPECTION_RECORD_STATUS.FIRST_REVIEW ||
    status === INSPECTION_RECORD_STATUS.SECOND_REVIEW ||
    status === INSPECTION_RECORD_STATUS.COMPLETED ||
    status === INSPECTION_STATUS.FIRST_REVIEW ||
    status === INSPECTION_STATUS.SECOND_REVIEW ||
    status === INSPECTION_STATUS.COMPLETED ||
    awaitsCrossubApproval({
      status: apiStatus,
      completedAt: record?.completedDate ?? inspection.completedAt,
      approvedAt,
      createdAt: record?.createdAt ?? inspection.createdAt,
    });

  if (reportSubmitted) return 'awaiting_approval';

  if (inspectorHasAcceptedJob(effectiveRecord, effectiveInspection)) return 'scheduled';
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
  awaitingCrossubApproval?: boolean;
}): string {
  const ackParty = args.ackParty ?? 'tenant';
  const ackNoun = ackParty === 'agent' ? 'Agent' : 'Tenant';
  const ackLower = ackParty === 'agent' ? 'agent' : 'tenant';
  if (args.tenantAcked) return `${ackNoun} acknowledgement complete`;
  if (args.keyReturned) return `Keys returned — awaiting ${ackLower} acknowledgement`;
  if (args.awaitingCrossubApproval) {
    return 'Report submitted — pending approval from CROSSUB';
  }
  if (args.reportSubmitted) return 'Report submitted — awaiting key return';
  if (args.keyCollected) return 'Keys collected — inspection in progress';
  if (args.accepted) return 'Accepted — awaiting key collection';
  const phase = (args.workflowPhase ?? '').toLowerCase().replace(/_/g, ' ');
  if (phase) return phase.charAt(0).toUpperCase() + phase.slice(1);
  return 'Awaiting inspector acceptance';
}
