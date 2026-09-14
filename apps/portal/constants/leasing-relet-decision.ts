import type { components } from '@crossub-thongz/api-contract';

import type { StatusBadgeVariant } from '@/components/agent/status-badge';
import type { ServerLeasingMainStatus } from '@/lib/leasing-cycle-types';

type ReletDecision = components['schemas']['AgentSetReletDecisionDto']['decision'];
type OpenProvider = NonNullable<components['schemas']['AgentSetReletDecisionDto']['openProvider']>;
type CreateReletDecision = NonNullable<
  components['schemas']['AgentCreateLeasingCycleDto']['reletDecision']
>;

/** The agent's answer to the re-let confirmation gate (contract enum values). */
export const LEASING_RELET_DECISION = {
  PROCEED: 'proceed',
  DO_NOT_RELET: 'do_not_relet',
  DECIDE_LATER: 'decide_later',
} as const satisfies Record<string, ReletDecision>;

/** The subset the create route accepts. */
export const LEASING_CREATE_RELET_DECISION = {
  PROCEED: LEASING_RELET_DECISION.PROCEED,
  DECIDE_LATER: LEASING_RELET_DECISION.DECIDE_LATER,
} as const satisfies Record<string, CreateReletDecision>;

/** Who runs the open inspections once the re-let proceeds. */
export const LEASING_OPEN_PROVIDER = {
  CROSSUB: 'crossub',
  AGENCY: 'agency',
} as const satisfies Record<string, OpenProvider>;

export type LeasingOpenProvider = (typeof LEASING_OPEN_PROVIDER)[keyof typeof LEASING_OPEN_PROVIDER];

export const LEASING_OPEN_PROVIDER_OPTIONS: ReadonlyArray<{
  value: LeasingOpenProvider;
  label: string;
  description: string;
}> = [
  {
    value: LEASING_OPEN_PROVIDER.CROSSUB,
    label: 'CROSSUB',
    description: 'CROSSUB schedules and runs the open inspections for you.',
  },
  {
    value: LEASING_OPEN_PROVIDER.AGENCY,
    label: 'Agency',
    description: 'Your agency runs the open inspections with a default inspector from your team.',
  },
];

/** Leasing L1 main status of a cycle (server enum values). */
export const LEASING_MAIN_STATUS = {
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  PREPARATION: 'preparation',
  ACTIVE_LEASING: 'active_leasing',
  OFFER_PENDING: 'offer_pending',
  ONBOARDING: 'onboarding',
  KEY_HANDOVER: 'key_handover',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, ServerLeasingMainStatus>;

/** The main status a cycle holds until the agent answers Proceed. */
export const LEASING_MAIN_STATUS_AWAITING_CONFIRMATION = LEASING_MAIN_STATUS.AWAITING_CONFIRMATION;

/** Agent-facing wording for each main status on list rows. */
export const LEASING_MAIN_STATUS_LABEL: Record<ServerLeasingMainStatus, string> = {
  [LEASING_MAIN_STATUS.AWAITING_CONFIRMATION]: 'Awaiting your confirmation',
  [LEASING_MAIN_STATUS.PREPARATION]: 'Preparation',
  [LEASING_MAIN_STATUS.ACTIVE_LEASING]: 'Leasing',
  [LEASING_MAIN_STATUS.OFFER_PENDING]: 'Offer pending',
  [LEASING_MAIN_STATUS.ONBOARDING]: 'Onboarding',
  [LEASING_MAIN_STATUS.KEY_HANDOVER]: 'Key handover',
  [LEASING_MAIN_STATUS.COMPLETED]: 'Completed',
  [LEASING_MAIN_STATUS.PAUSED]: 'Paused',
  [LEASING_MAIN_STATUS.CANCELLED]: 'Cancelled',
};

/** `StatusBadge` variant per main status — only the agent's own gate is a warning. */
export const LEASING_MAIN_STATUS_BADGE_VARIANT: Record<ServerLeasingMainStatus, StatusBadgeVariant> = {
  [LEASING_MAIN_STATUS.AWAITING_CONFIRMATION]: 'warning',
  [LEASING_MAIN_STATUS.PREPARATION]: 'default',
  [LEASING_MAIN_STATUS.ACTIVE_LEASING]: 'approval',
  [LEASING_MAIN_STATUS.OFFER_PENDING]: 'approval',
  [LEASING_MAIN_STATUS.ONBOARDING]: 'approval',
  [LEASING_MAIN_STATUS.KEY_HANDOVER]: 'approval',
  [LEASING_MAIN_STATUS.COMPLETED]: 'success',
  [LEASING_MAIN_STATUS.PAUSED]: 'default',
  [LEASING_MAIN_STATUS.CANCELLED]: 'default',
};

/** Timeline actor stamped on the server's re-let confirmation reminders. */
export const LEASING_RELET_REMINDER_ACTOR = 'system:leasing-relet-confirm';

/** Rungs on the server's reminder ladder. */
export const LEASING_RELET_REMINDER_MAX = 3;

/** Server cap on the do-not-re-let reason. */
export const LEASING_RELET_DECLINE_REASON_MAX = 500;

export const LEASING_RELET_COPY = {
  title: 'Confirm this re-let',
  explanation:
    'Nothing is advertised and open inspections cannot be requested until you confirm this letting should go ahead.',
  reminderLine: (sent: number) =>
    `Reminder sent ${Math.min(sent, LEASING_RELET_REMINDER_MAX)} of ${LEASING_RELET_REMINDER_MAX}`,
  proceedLabel: 'Proceed',
  proceedDescription: 'Start the letting and choose who runs the open inspections.',
  doNotReletLabel: 'Do not re-let',
  doNotReletDescription: 'Cancel this letting. The property is not advertised.',
  decideLaterLabel: 'Decide later',
  decideLaterDescription: 'Keep it waiting. CROSSUB will remind you again.',
  proceedDialogTitle: 'Proceed with this re-let',
  proceedDialogDescription: 'Choose who runs the open inspections for this letting.',
  providerQuestion: 'Who runs the open inspections?',
  inspectorLabel: 'Default inspector',
  inspectorPlaceholder: 'Select a team member',
  inspectorRequired: 'Select a default inspector from your team',
  inspectorLoading: 'Loading team…',
  inspectorEmpty: 'No team members found for this agency',
  inspectorLoadFailed: 'Could not load your team',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  doNotReletDialogTitle: 'Do not re-let',
  doNotReletDialogDescription: 'This cancels the letting. Tell CROSSUB why.',
  reasonLabel: 'Reason',
  reasonPlaceholder: 'e.g. The owner is moving back in',
  reasonRequired: 'Enter a reason for not re-letting',
  proceedSuccess: 'Re-let confirmed — the letting is under way',
  doNotReletSuccess: 'Letting cancelled — the property will not be re-let',
  decideLaterSuccess: 'Saved — CROSSUB will remind you again',
  genericError: 'Could not save your decision',
  openInspectionBlockedHint:
    'Confirm the re-let above before requesting an open inspection.',
} as const;
