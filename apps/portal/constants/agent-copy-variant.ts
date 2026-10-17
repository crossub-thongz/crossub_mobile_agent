import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import {
  PROPERTY_APPROVAL_STATUS,
  propertyApprovalBlockMessage,
  type PropertyApprovalStatus,
} from '@/constants/api-enums';

/**
 * Which copy set a screen shows. Self-Manage agencies run the work themselves, so copy speaks
 * to the agent ("you", with CROS assisting). Inspection Only, Full Service and Legacy keep the
 * CROSSUB-serviced copy ("CROSSUB is handling this", "your Account Manager").
 * Resolve with `agentCopyVariant` in `lib/portal-service-level.ts`.
 */
export const AGENT_COPY_VARIANT = {
  SERVICED: 'serviced',
  SELF_MANAGED: 'self_managed',
} as const;

export type AgentCopyVariant = (typeof AGENT_COPY_VARIANT)[keyof typeof AGENT_COPY_VARIANT];

/** Tasks page header, bucket cards and the status pill on a row the agent owns. */
export const TASK_LIST_COPY: Record<
  AgentCopyVariant,
  {
    pageSubtitle: string;
    needActionLabel: string;
    needActionSublabel: string;
    /** False when no property can be CROSSUB-handled, so the CROS handling card is dropped. */
    showCrosHandlingBucket: boolean;
    /** Status on work that would be "CROS handling" on a serviced tier but is the agent's own. */
    ownWorkStatusLabel: string;
    ownWorkStatusFallback: string;
  }
> = {
  serviced: {
    pageSubtitle: 'Track and manage all work across your portfolio',
    needActionLabel: 'Needs My Action',
    needActionSublabel: 'Agent needs to act',
    showCrosHandlingBucket: true,
    ownWorkStatusLabel: 'Needs My Action',
    ownWorkStatusFallback: 'Approval required',
  },
  self_managed: {
    pageSubtitle: `Run all work across your portfolio, with ${CROS_ASSISTANT_NAME} assisting`,
    needActionLabel: 'Needs My Action',
    needActionSublabel: `Your work, ${CROS_ASSISTANT_NAME} assisting`,
    showCrosHandlingBucket: false,
    ownWorkStatusLabel: 'Your next step',
    ownWorkStatusFallback: `${CROS_ASSISTANT_NAME} can help with this step`,
  },
};

/** CROS's role line in the assistant header, empty state and property greeting. */
export const GII_ROLE_COPY: Record<
  AgentCopyVariant,
  {
    headerRole: string;
    headerScopedRole: string;
    askTitle: string;
    propertyGreeting: (lead: string, address: string, jobCount: number) => string;
  }
> = {
  serviced: {
    headerRole: 'Your Account Manager',
    headerScopedRole: 'Account Manager',
    askTitle: `Ask ${CROS_ASSISTANT_NAME}, your Account Manager`,
    propertyGreeting: (lead, address, jobCount) =>
      jobCount > 0
        ? `${lead} — I'm your Account Manager for ${address}. ${jobCount} job${jobCount === 1 ? '' : 's'} in progress here — tap any to open, or ask me about this property.`
        : `${lead} — I'm your Account Manager for ${address}. No jobs in progress right now. Ask me to add a repair, schedule an inspection, start leasing, or check status.`,
  },
  self_managed: {
    headerRole: 'Your assistant',
    headerScopedRole: 'Assistant',
    askTitle: `Ask ${CROS_ASSISTANT_NAME}, your assistant`,
    propertyGreeting: (lead, address, jobCount) =>
      jobCount > 0
        ? `${lead} — I'm ${CROS_ASSISTANT_NAME}, here to help you run ${address}. ${jobCount} job${jobCount === 1 ? '' : 's'} in progress here — tap any to open, or ask me to draft your next step.`
        : `${lead} — I'm ${CROS_ASSISTANT_NAME}, here to help you run ${address}. No jobs in progress right now. Ask me to help you log a repair, schedule an inspection, start leasing, or check status.`,
  },
};

/** Banner on a newly registered property that is not yet approved for workflows. */
export const PROPERTY_APPROVAL_BANNER_COPY: Record<
  AgentCopyVariant,
  {
    pendingTitle: string;
    declinedTitle: string;
    body: (status: PropertyApprovalStatus, declineReason?: string) => string;
    pendingNote: string;
  }
> = {
  serviced: {
    pendingTitle: 'Waiting for CROSSUB to approve this property',
    declinedTitle: 'CROSSUB does not service this property',
    body: propertyApprovalBlockMessage,
    pendingNote:
      'Leasing, inspections, maintenance and rent reviews stay locked until then. If the address needs correcting, edit it now — that is what CROSSUB reviews.',
  },
  self_managed: {
    pendingTitle: 'This property is being checked before you can start work',
    declinedTitle: 'This property could not be added',
    body: (status, declineReason) => {
      if (status === PROPERTY_APPROVAL_STATUS.DECLINED) {
        return declineReason?.trim()
          ? `Reason: ${declineReason.trim()}`
          : 'Contact CROSSUB support if you think this is wrong.';
      }
      return 'CROSSUB checks every newly added address before its workflows open. You can keep editing the details in the meantime.';
    },
    pendingNote:
      'Leasing, inspections, maintenance and rent reviews unlock once the check is done. If the address needs correcting, edit it now.',
  },
};
