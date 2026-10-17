/** Self-Manage Conversations page (Phase 0 shell): filters and copy. */

export const CONVERSATION_READ_FILTER = {
  ALL: 'all',
  UNREAD: 'unread',
} as const;
export type ConversationReadFilter =
  (typeof CONVERSATION_READ_FILTER)[keyof typeof CONVERSATION_READ_FILTER];

export const CONVERSATION_READ_FILTERS: readonly { id: ConversationReadFilter; label: string }[] = [
  { id: CONVERSATION_READ_FILTER.ALL, label: 'All' },
  { id: CONVERSATION_READ_FILTER.UNREAD, label: 'Unread' },
];

export const CONVERSATIONS_COPY = {
  title: 'Conversations',
  searchPlaceholder: 'Search threads…',
  emptyTitle: 'No conversations yet',
  emptyDescription: 'Threads with tenants about your properties appear here.',
  noMatch: 'No threads match.',
  selectThread: 'Select a thread to read the conversation.',
  contextHeading: 'Job context',
  propertyHeading: 'Property',
  ownerLabel: 'Owner',
  tenantLabel: 'Tenant',
  linkedJobHeading: 'Linked job',
  openJob: 'Open job',
  openProperty: 'Open property',
  noLinkedJob: 'This thread is not linked to a maintenance, inspection or leasing job.',
  noPropertyTitle: 'No property on this thread',
  noPropertyDescription: 'Job context shows once a thread is linked to one of your properties.',
  decisionsHeading: 'Owner decisions',
} as const;
