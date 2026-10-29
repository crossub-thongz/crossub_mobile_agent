import {
  CONVERSATION_APP_NAME,
  CONVERSATION_APP_RECIPIENTS,
  CONVERSATION_LINKABLE_WORKFLOW_TYPES,
  CONVERSATION_MESSAGE_DIRECTION,
  CONVERSATION_REPLY_CHANNEL,
  type ConversationLinkableWorkflowType,
  type ConversationRecipient,
  type ConversationReplyChannel,
} from '@/constants/conversations';
import type { AgencyTeamMember } from '@/lib/crossub-api/agent-client';
import type {
  AgentConversationDetail,
  AgentConversationSummary,
  AgentConversationWorkflowOption,
} from '@/lib/crossub-api/agent-conversation-client';

/** Headline for a thread: its title, else the email subject. */
export function conversationHeadline(c: Pick<AgentConversationSummary, 'title' | 'subject'>): string {
  return c.title?.trim() || c.subject;
}

/** The list row for a thread, from the detail an action returned. */
export function summaryFromDetail(detail: AgentConversationDetail): AgentConversationSummary {
  const { messages: _messages, ...summary } = detail;
  return summary;
}

/**
 * True when an action moved the thread in or out of the list's filters (resolved state or
 * assignee), so the list must be re-read rather than patched in place.
 */
export function conversationListMembershipChanged(
  before: Pick<AgentConversationSummary, 'id' | 'resolved' | 'assignedToId'>,
  after: Pick<AgentConversationSummary, 'id' | 'resolved' | 'assignedToId'>,
): boolean {
  return (
    before.id === after.id &&
    (before.resolved !== after.resolved || before.assignedToId !== after.assignedToId)
  );
}

/** Append a further page, dropping rows already shown (a thread can move between pages). */
export function mergeConversationPages(
  shown: readonly AgentConversationSummary[],
  next: readonly AgentConversationSummary[],
): AgentConversationSummary[] {
  const seen = new Set(shown.map((c) => c.id));
  return [...shown, ...next.filter((c) => !seen.has(c.id))];
}

/** Replace one row in place; rows not in the list stay as they are. */
export function replaceConversationRow(
  rows: readonly AgentConversationSummary[],
  row: AgentConversationSummary,
): AgentConversationSummary[] {
  return rows.map((c) => (c.id === row.id ? row : c));
}

/** The newest inbound message — the one an email reply answers. */
export function latestInboundMessageId(detail: AgentConversationDetail): string | undefined {
  for (let i = detail.messages.length - 1; i >= 0; i -= 1) {
    const message = detail.messages[i];
    if (message.direction === CONVERSATION_MESSAGE_DIRECTION.INBOUND) return message.id;
  }
  return undefined;
}

/**
 * Who a reply goes to by default: the sender of the latest inbound email, else whoever the
 * thread last emailed. The thread's contact may have no address on file (a vacant property),
 * so the composer starts from the address the thread actually used; blank lets the server pick.
 */
export function defaultReplyToEmail(detail: AgentConversationDetail): string {
  for (let i = detail.messages.length - 1; i >= 0; i -= 1) {
    const message = detail.messages[i];
    if (message.direction === CONVERSATION_MESSAGE_DIRECTION.INBOUND && message.fromEmail) {
      return message.fromEmail;
    }
  }
  for (let i = detail.messages.length - 1; i >= 0; i -= 1) {
    const message = detail.messages[i];
    if (message.direction === CONVERSATION_MESSAGE_DIRECTION.OUTBOUND && message.toEmail) {
      return message.toEmail;
    }
  }
  return '';
}

export type LinkableConversationJob = AgentConversationWorkflowOption & {
  workflowType: ConversationLinkableWorkflowType;
};

function isLinkableJob(option: AgentConversationWorkflowOption): option is LinkableConversationJob {
  return CONVERSATION_LINKABLE_WORKFLOW_TYPES.has(option.workflowType);
}

/** Jobs the link route accepts (the list can also carry tribunal cases, which it rejects). */
export function linkableConversationJobs(
  options: readonly AgentConversationWorkflowOption[],
): LinkableConversationJob[] {
  return options.filter(isLinkableJob);
}

/** Stable `<select>` value for a job option. */
export function conversationJobKey(job: Pick<AgentConversationWorkflowOption, 'workflowType' | 'workflowId'>): string {
  return `${job.workflowType}:${job.workflowId}`;
}

export function teamMemberName(member: AgencyTeamMember): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return name || member.email;
}

type ConversationParticipant = AgentConversationDetail['participants'][number];

function isAppParty(
  participant: ConversationParticipant,
): participant is ConversationParticipant & { userType: ConversationRecipient } {
  return CONVERSATION_APP_RECIPIENTS.has(participant.userType as ConversationRecipient);
}

/**
 * The tenants a thread names: the people an app message reaches, since the tenant app lists a
 * property's thread only when it names them. Empty when the thread has no property.
 */
export function conversationAppParties(detail: AgentConversationDetail): ConversationParticipant[] {
  if (!detail.propertyId) return [];
  return detail.participants.filter(isAppParty);
}

/** "Tia Tenant (tenant app)", joined, for the composer heading and the sent toast. */
export function appPartiesLabel(parties: readonly ConversationParticipant[]): string {
  return parties
    .filter(isAppParty)
    .map((p) => `${p.name} (${CONVERSATION_APP_NAME[p.userType]})`)
    .join(', ');
}

/** App when the thread's latest message went by app and an app message can still go; else email. */
export function defaultReplyChannel(detail: AgentConversationDetail): ConversationReplyChannel {
  const latest = detail.messages[detail.messages.length - 1];
  return latest?.channel === CONVERSATION_REPLY_CHANNEL.APP && conversationAppParties(detail).length > 0
    ? CONVERSATION_REPLY_CHANNEL.APP
    : CONVERSATION_REPLY_CHANNEL.EMAIL;
}
