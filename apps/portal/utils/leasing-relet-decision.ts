import type { StatusBadgeVariant } from '@/components/agent/status-badge';
import type { AgencyTeamMember } from '@/lib/crossub-api/agent-client';
import type { CreateAgentLeasingCycleInput } from '@/lib/crossub-api/agent-workflow-client';
import type { LeasingTimelineEvent } from '@/lib/leasing/types';
import {
  LEASING_CREATE_RELET_DECISION,
  LEASING_MAIN_STATUS_AWAITING_CONFIRMATION,
  LEASING_MAIN_STATUS_BADGE_VARIANT,
  LEASING_MAIN_STATUS_LABEL,
  LEASING_RELET_REMINDER_ACTOR,
} from '@/constants/leasing-relet-decision';

/** True while the cycle waits on the agent's re-let confirmation. */
export function isAwaitingReletConfirmation(detail: { mainStatus?: string } | null | undefined): boolean {
  return detail?.mainStatus === LEASING_MAIN_STATUS_AWAITING_CONFIRMATION;
}

type CycleMainStatusSource = { mainStatus?: string } | null | undefined;

function knownMainStatus(cycle: CycleMainStatusSource): keyof typeof LEASING_MAIN_STATUS_LABEL | null {
  const status = cycle?.mainStatus;
  return status && Object.prototype.hasOwnProperty.call(LEASING_MAIN_STATUS_LABEL, status)
    ? (status as keyof typeof LEASING_MAIN_STATUS_LABEL)
    : null;
}

/** Agent-facing main-status label; null when the server did not send a (known) one. */
export function leasingCycleStatusLabel(cycle: CycleMainStatusSource): string | null {
  const status = knownMainStatus(cycle);
  return status ? LEASING_MAIN_STATUS_LABEL[status] : null;
}

/** `StatusBadge` variant for the main status; null when absent. */
export function leasingCycleStatusBadgeVariant(cycle: CycleMainStatusSource): StatusBadgeVariant | null {
  const status = knownMainStatus(cycle);
  return status ? LEASING_MAIN_STATUS_BADGE_VARIANT[status] : null;
}

/**
 * The step text to show for a letting. A cycle awaiting the agent's confirmation has not
 * started, so its lifecycle step (open inspection) would mislead — show the status instead.
 */
export function leasingCycleStageLabel(cycle: CycleMainStatusSource, lifecycleStepLabel: string): string {
  return isAwaitingReletConfirmation(cycle)
    ? (leasingCycleStatusLabel(cycle) ?? lifecycleStepLabel)
    : lifecycleStepLabel;
}

/** Reminders the server has sent on the re-let ladder, counted from the timeline. */
export function countReletReminders(timeline: ReadonlyArray<Pick<LeasingTimelineEvent, 'actor'>>): number {
  return timeline.filter((event) => event.actor === LEASING_RELET_REMINDER_ACTOR).length;
}

/** "First Last", falling back to the email. */
export function agencyTeamMemberLabel(member: AgencyTeamMember): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return name || member.email;
}

/**
 * Open-inspection fields for a cycle created from the agent's own create form. The agent
 * has already said "go" by creating it, so the cycle is created confirmed (`proceed`) — a
 * cycle created unconfirmed 409s the very next open-inspection request. When the agency
 * runs the opens the server requires a default inspector with `proceed`.
 */
export function buildCreateLeasingOpenInspectionFields(
  crossubConductsOpen: boolean,
  defaultInspectorId: string,
): Pick<
  CreateAgentLeasingCycleInput,
  'skipOpenInspection' | 'reletDecision' | 'agentConductsOpenInspection' | 'defaultInspectorId'
> {
  if (crossubConductsOpen) {
    return {
      skipOpenInspection: true,
      reletDecision: LEASING_CREATE_RELET_DECISION.PROCEED,
    };
  }
  return {
    skipOpenInspection: false,
    reletDecision: LEASING_CREATE_RELET_DECISION.PROCEED,
    agentConductsOpenInspection: true,
    defaultInspectorId,
  };
}
