import type { AgencyTeamMember } from '@/lib/crossub-api/agent-client';
import type { CreateAgentLeasingCycleInput } from '@/lib/crossub-api/agent-workflow-client';
import type { LeasingTimelineEvent } from '@/lib/leasing/types';
import {
  LEASING_CREATE_RELET_DECISION,
  LEASING_MAIN_STATUS_AWAITING_CONFIRMATION,
  LEASING_RELET_REMINDER_ACTOR,
} from '@/constants/leasing-relet-decision';

/** True while the cycle waits on the agent's re-let confirmation. */
export function isAwaitingReletConfirmation(detail: { mainStatus?: string } | null | undefined): boolean {
  return detail?.mainStatus === LEASING_MAIN_STATUS_AWAITING_CONFIRMATION;
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
