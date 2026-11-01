/** The Cros panel's tab names. History sits behind an icon, so its name is the icon's label. */
export const CROS_PANEL_TAB = {
  TODAY: 'Today',
  CHAT: 'Chat',
  HISTORY: 'Past chats',
} as const;

/** The heading on Cros's list of what needs the agent; it is read live, not this morning's copy. */
export const CROS_TODAY_LIST_TITLE = 'Needs you now';

/** Questions the Today tab offers after "What needs me today?". */
export const CROS_TODAY_PROMPT = {
  OVERDUE_RENT: {
    id: 'overdue-rent',
    label: 'Show overdue rent reviews',
    prompt: 'Show my overdue rent reviews.',
  },
  WEEK: {
    id: 'week',
    label: 'Summarise this week',
    prompt: 'Summarise what is coming up in my portfolio in the next 7 days.',
  },
} as const;

/** The Today tab's "What can I help with?" list: a topic each, asked as a plain question. */
export const CROS_HELP_TOPIC = {
  RENT: { id: 'rent', title: 'Rent reviews', prompt: 'Which rent reviews need me, and what should I do next?' },
  LEASES: { id: 'lease', title: 'Lease renewals', prompt: 'Which leases are ending soon, and what should I do about them?' },
  REPAIRS: { id: 'maintenance', title: 'Repairs and maintenance', prompt: 'Which repairs need me, and what is the next step for each?' },
  INSPECTIONS: { id: 'inspections', title: 'Inspections', prompt: 'Which inspections need me, and what is coming up?' },
} as const;

/** An empty chat's opening line and the questions it offers after "What needs me today?". */
export const CROS_CHAT_EMPTY_LEAD = 'Ask me anything about your properties, or start with one of these.';
export const CROS_CHAT_STARTERS = [
  { id: 'add-property', label: 'Help me add a property', prompt: 'Help me add a new property to my portfolio.' },
  { id: 'repair', label: 'Log a repair', prompt: 'A tenant has reported a repair. Help me log it.' },
] as const;

/** The Tasks page's list of what is waiting on the agent but is not a task. */
export const TASKS_ALSO_WAITING_COPY = {
  TITLE: 'Also waiting on you',
  SUBTITLE: 'Not tasks, but counted in the Tasks badge: money owed, messages, leases ending.',
} as const;
