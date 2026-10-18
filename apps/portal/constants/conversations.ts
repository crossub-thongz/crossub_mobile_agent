/** Self-Manage Conversations page (Phase 2 agency inbox): filters, values and copy. */
import type {
  AgentConversationJobInput,
  AgentConversationListState,
  AgentConversationMessage,
  AgentConversationStateAction,
  AgentConversationWorkflowOption,
  AgentCreateConversationInput,
} from '@/lib/crossub-api/agent-conversation-client';

export const CONVERSATION_STATE_FILTER = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  ALL: 'all',
} as const satisfies Record<string, AgentConversationListState>;

export const CONVERSATION_STATE_FILTERS: readonly { id: AgentConversationListState; label: string }[] = [
  { id: CONVERSATION_STATE_FILTER.OPEN, label: 'Open' },
  { id: CONVERSATION_STATE_FILTER.RESOLVED, label: 'Resolved' },
  { id: CONVERSATION_STATE_FILTER.ALL, label: 'All' },
];

export const CONVERSATION_STATE_ACTION = {
  RESOLVE: 'resolve',
  REOPEN: 'reopen',
} as const satisfies Record<string, AgentConversationStateAction>;

export const CONVERSATION_MESSAGE_DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const satisfies Record<string, AgentConversationMessage['direction']>;

export const CONVERSATION_REPLY_CHANNEL = {
  EMAIL: 'email',
} as const;

export type ConversationRecipient = AgentCreateConversationInput['recipient'];

export const CONVERSATION_RECIPIENT = {
  TENANT: 'tenant',
  LANDLORD: 'landlord',
  CONTRACTOR: 'contractor',
} as const satisfies Record<string, ConversationRecipient>;

export const CONVERSATION_RECIPIENT_OPTIONS: readonly { id: ConversationRecipient; label: string }[] = [
  { id: CONVERSATION_RECIPIENT.TENANT, label: 'Tenant' },
  { id: CONVERSATION_RECIPIENT.LANDLORD, label: 'Owner' },
  { id: CONVERSATION_RECIPIENT.CONTRACTOR, label: 'Contractor' },
];

/** Recipients the server needs a typed address for; tenant and owner fall back to the property record. */
export const CONVERSATION_RECIPIENTS_REQUIRING_EMAIL: ReadonlySet<ConversationRecipient> = new Set([
  CONVERSATION_RECIPIENT.CONTRACTOR,
]);

export type ConversationLinkableWorkflowType = AgentConversationJobInput['workflowType'];

/** Job types `PATCH /agent/conversations/:id/job` accepts; the jobs list can also carry tribunal cases. */
export const CONVERSATION_LINKABLE_WORKFLOW_TYPES: ReadonlySet<AgentConversationWorkflowOption['workflowType']> =
  new Set<ConversationLinkableWorkflowType>([
    'MAINTENANCE_REQUEST',
    'INSPECTION',
    'LEASING_CYCLE',
    'RENT_REVIEW',
    'VACATING_TASK',
  ]);

export const CONVERSATION_WORKFLOW_TYPE_LABEL: Record<AgentConversationWorkflowOption['workflowType'], string> = {
  MAINTENANCE_REQUEST: 'Maintenance',
  INSPECTION: 'Inspection',
  LEASING_CYCLE: 'Leasing',
  RENT_REVIEW: 'Rent review',
  TRIBUNAL_CASE: 'Tribunal',
  VACATING_TASK: 'End of lease',
};

/** The write running on the open thread, so only its button shows progress and all disable. */
export const CONVERSATION_ACTION = {
  SEND: 'send',
  DRAFT: 'draft',
  STATE: 'state',
  ASSIGN: 'assign',
  PROPERTY: 'property',
  LINK_JOB: 'link-job',
  UNLINK_JOB: 'unlink-job',
} as const;
export type ConversationAction = (typeof CONVERSATION_ACTION)[keyof typeof CONVERSATION_ACTION];

/** Below `lg` the workspace shows one pane at a time. */
export const CONVERSATION_MOBILE_VIEW = {
  LIST: 'list',
  THREAD: 'thread',
  CONTEXT: 'context',
} as const;
export type ConversationMobileView = (typeof CONVERSATION_MOBILE_VIEW)[keyof typeof CONVERSATION_MOBILE_VIEW];

/** Server-side `pageSize` for the thread list (max 100). */
export const CONVERSATION_PAGE_SIZE = 25;

/** The server ignores searches shorter than this. */
export const CONVERSATION_SEARCH_MIN_CHARS = 2;

export const CONVERSATION_SEARCH_DEBOUNCE_MS = 300;

/** Cros needs a steer of 3 to 1,000 characters; this one is used when the agent types none. */
export const CONVERSATION_AI_DRAFT_INSTRUCTION_MIN_CHARS = 3;
export const CONVERSATION_AI_DRAFT_DEFAULT_INSTRUCTION =
  'Reply to the latest message helpfully and briefly.';

/** Sentinel select values: native `<select>` options cannot carry null. */
export const CONVERSATION_UNASSIGNED_VALUE = '';
export const CONVERSATION_ALL_PROPERTIES_VALUE = '';
/** Value of a picker's prompt option ("Choose…"), which is never a real choice. */
export const CONVERSATION_SELECT_PROMPT_VALUE = '';

/** Reply delivery outcome the server reports when the email actually went out. */
export const CONVERSATION_DELIVERY_SENT = 'sent';

export const CONVERSATIONS_COPY = {
  title: 'Conversations',
  searchPlaceholder: 'Search threads…',
  emptyTitle: 'No conversations yet',
  emptyDescription: 'Mail to your agency address and threads about your properties appear here.',
  noMatch: 'No threads match.',
  selectThread: 'Select a thread to read the conversation.',
  loadFailed: "Couldn't load conversations.",
  retry: 'Retry',
  loadMore: 'Load more',
  loading: 'Loading…',
  assignedToMe: 'Assigned to me',
  allProperties: 'All properties',
  noProperty: 'No property',
  unassigned: 'Unassigned',
  unread: 'Unread',
  newConversation: 'New conversation',
  back: 'Back',
  showContext: 'Job context',
  showThread: 'Conversation',
  resolve: 'Resolve',
  reopen: 'Reopen',
  resolved: 'Resolved',
  resolvedToast: 'Conversation resolved',
  reopenedToast: 'Conversation reopened',
  assigneeLabel: 'Assignee',
  assigneeSaved: 'Assignee updated',
  inbound: 'Received',
  outbound: 'Sent',
  noMessages: 'No messages on this thread yet.',
  attachments: 'Attachments',
  toLabel: 'To',
  replyPlaceholder: 'Write an email reply…',
  replySubjectLabel: 'Subject',
  replyToLabel: 'To',
  replyToPlaceholder: 'To — leave blank to write to the thread’s contact',
  send: 'Send email',
  sent: 'Email sent',
  notSent: (delivery: string) => `Saved, but the email was not sent (${delivery.replace(/_/g, ' ')}).`,
  templateLabel: 'Template',
  templatePlaceholder: 'Insert a template…',
  crosDraft: 'Cros draft',
  crosInstructionPlaceholder: 'Tell Cros what to say (optional)',
  crosDrafted: 'Cros drafted a reply. Check it before sending.',
  contextHeading: 'Job context',
  propertyHeading: 'Property',
  ownerLabel: 'Owner',
  tenantLabel: 'Tenant',
  linkedJobHeading: 'Linked job',
  openJob: 'Open job',
  openProperty: 'Open property',
  noLinkedJob: 'This thread is not linked to a job.',
  linkJob: 'Link job',
  linkJobPlaceholder: 'Choose a job on this property…',
  noJobs: 'No open jobs on this property.',
  unlinkJob: 'Unlink',
  jobLinked: 'Job linked',
  jobUnlinked: 'Job unlinked',
  noPropertyTitle: 'No property on this thread',
  noPropertyDescription: 'File it under one of your properties to see its jobs and owner decisions.',
  fileUnderProperty: 'File under property',
  fileUnderPropertyPlaceholder: 'Choose a property…',
  propertyFiled: 'Filed under the property',
  decisionsHeading: 'Owner decisions',
  composeTitle: 'New conversation',
  composeDescription: 'Email a tenant, owner or contractor from your agency address.',
  composePropertyLabel: 'Property',
  composePropertyPlaceholder: 'Choose a property…',
  composeRecipientLabel: 'To',
  composeEmailLabel: 'Email address',
  composeEmailOptional: 'Leave blank to use the address on the property record.',
  composeEmailRequired: 'Type the contractor’s email address.',
  composeSubjectLabel: 'Subject',
  composeBodyLabel: 'Message',
  composeSend: 'Send',
  composeCancel: 'Cancel',
} as const;
