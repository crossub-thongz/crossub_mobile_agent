import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  FileText,
  Gavel,
  MessageSquare,
  Receipt,
  UserCheck,
  Wallet,
  Wrench,
} from 'lucide-react';

import type { GiiServerBriefingCategory } from '@/lib/crossub-api/gii-client';
import type { TaskListV2Row } from '@/lib/task-list-v2';

import type { NeedActionCategory, Priority } from '@/lib/types';

/** Hour boundaries (local clock) for the greeting salutation. */
export const GREETING_MORNING_UNTIL_HOUR = 12;
export const GREETING_AFTERNOON_UNTIL_HOUR = 18;

/** How many rows the briefing lists before "View all". Matches the dashboard preview. */
export const BRIEFING_MAX_ROWS = 6;

/** How often the app reads Cros's list again while it stays open. */
export const CROS_TODAY_REFRESH_MS = 5 * 60_000;

/** Groups named in the one-line summary before it collapses to "+N more". */
export const BRIEFING_MAX_SUMMARY_GROUPS = 3;

/** Priority sort rank — lower sorts first. Mirrors `buildRemindingQueue` and the dashboard preview. */
export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** Single source of the category → icon map, shared by the dashboard preview and the Gii briefing. */
export const CATEGORY_ICON: Record<NeedActionCategory, LucideIcon> = {
  Leasing: FileText,
  Maintenance: Wrench,
  Inspection: ClipboardList,
  Accounting: Wallet,
  Tribunal: Gavel,
  Others: Building2,
};

/** Fallback short noun per category, used when a group id has no specific label below. */
export const CATEGORY_NOUN: Record<NeedActionCategory, string> = {
  Leasing: 'leasing',
  Maintenance: 'maintenance',
  Inspection: 'inspection',
  Accounting: 'accounting',
  Tribunal: 'tribunal',
  Others: 'other',
};

/**
 * Short noun per need-action GROUP id (from `buildNeedActionGroups`). Keeps "rent review"
 * distinct from other leasing items in the summary line — the coarse category alone would
 * flatten it to "leasing", losing the exact thing the briefing is meant to surface.
 */
export const GROUP_SUMMARY_NOUN: Record<string, string> = {
  'maintenance-approval': 'maintenance',
  'rent-review': 'rent review',
  'lease-renewal': 'lease renewal',
  tribunal: 'tribunal',
  arrears: 'arrears',
  'tenant-app': 'new leasing',
  inspection: 'inspection',
  documents: 'documents',
  other: 'other',
};

/** Empty-state line — a warm caught-up message, never a blank card. */
export const BRIEFING_EMPTY_COPY =
  "You're all caught up — nothing needs you right now. Enjoy the calm.";

/** The server briefing's categories (Jarvis 2.2), as the contract names them. */
export const SERVER_BRIEFING_CATEGORY = {
  URGENT_REPAIR: 'urgent_repair',
  ARREARS: 'arrears',
  QUOTE_WAITING: 'quote_waiting',
  APPLICATION_APPROVAL: 'application_approval',
  END_LEASING: 'end_leasing',
  RENT_REVIEW: 'rent_review',
  REPAIR_NEXT_STEP: 'repair_next_step',
  INSPECTION: 'inspection',
  UNANSWERED_MESSAGE: 'unanswered_message',
  LEASE_EXPIRING: 'lease_expiring',
} as const satisfies Record<string, GiiServerBriefingCategory>;

/** Icon per server briefing category. */
export const SERVER_BRIEFING_ICON: Record<GiiServerBriefingCategory, LucideIcon> = {
  [SERVER_BRIEFING_CATEGORY.URGENT_REPAIR]: AlertTriangle,
  [SERVER_BRIEFING_CATEGORY.ARREARS]: Wallet,
  [SERVER_BRIEFING_CATEGORY.QUOTE_WAITING]: Receipt,
  [SERVER_BRIEFING_CATEGORY.APPLICATION_APPROVAL]: UserCheck,
  [SERVER_BRIEFING_CATEGORY.END_LEASING]: DoorOpen,
  [SERVER_BRIEFING_CATEGORY.RENT_REVIEW]: FileText,
  [SERVER_BRIEFING_CATEGORY.REPAIR_NEXT_STEP]: Wrench,
  [SERVER_BRIEFING_CATEGORY.INSPECTION]: ClipboardList,
  [SERVER_BRIEFING_CATEGORY.UNANSWERED_MESSAGE]: MessageSquare,
  [SERVER_BRIEFING_CATEGORY.LEASE_EXPIRING]: CalendarClock,
};

/**
 * The parts the dashboard splits "Needs Your Attention" into. Every briefing category and every
 * task category falls in exactly one, so the parts always add up to the one count.
 */
export const NEEDS_YOU_GROUP = {
  RENT: 'rent',
  REPAIRS: 'repairs',
  LEASES: 'leases',
  OTHER: 'other',
} as const;
export type NeedsYouGroup = (typeof NEEDS_YOU_GROUP)[keyof typeof NEEDS_YOU_GROUP];
export const NEEDS_YOU_GROUPS = Object.values(NEEDS_YOU_GROUP) as readonly NeedsYouGroup[];

export const NEEDS_YOU_GROUP_OF_CATEGORY: Record<GiiServerBriefingCategory, NeedsYouGroup> = {
  [SERVER_BRIEFING_CATEGORY.ARREARS]: NEEDS_YOU_GROUP.RENT,
  [SERVER_BRIEFING_CATEGORY.RENT_REVIEW]: NEEDS_YOU_GROUP.RENT,
  [SERVER_BRIEFING_CATEGORY.URGENT_REPAIR]: NEEDS_YOU_GROUP.REPAIRS,
  [SERVER_BRIEFING_CATEGORY.QUOTE_WAITING]: NEEDS_YOU_GROUP.REPAIRS,
  [SERVER_BRIEFING_CATEGORY.REPAIR_NEXT_STEP]: NEEDS_YOU_GROUP.REPAIRS,
  [SERVER_BRIEFING_CATEGORY.APPLICATION_APPROVAL]: NEEDS_YOU_GROUP.LEASES,
  [SERVER_BRIEFING_CATEGORY.END_LEASING]: NEEDS_YOU_GROUP.LEASES,
  [SERVER_BRIEFING_CATEGORY.LEASE_EXPIRING]: NEEDS_YOU_GROUP.LEASES,
  [SERVER_BRIEFING_CATEGORY.INSPECTION]: NEEDS_YOU_GROUP.OTHER,
  [SERVER_BRIEFING_CATEGORY.UNANSWERED_MESSAGE]: NEEDS_YOU_GROUP.OTHER,
};

export const NEEDS_YOU_GROUP_OF_TASK: Record<TaskListV2Row['category'], NeedsYouGroup> = {
  rent_review: NEEDS_YOU_GROUP.RENT,
  maintenance: NEEDS_YOU_GROUP.REPAIRS,
  leasing: NEEDS_YOU_GROUP.LEASES,
  inspection: NEEDS_YOU_GROUP.OTHER,
  tribunal: NEEDS_YOU_GROUP.OTHER,
};

export const NEEDS_YOU_GROUP_COPY: Record<NeedsYouGroup, { label: string; hint: string; icon: LucideIcon; tone: string }> = {
  [NEEDS_YOU_GROUP.RENT]: { label: 'Rent', hint: 'Money owed, rent reviews', icon: Wallet, tone: 'bg-rose-500/12 text-rose-600' },
  [NEEDS_YOU_GROUP.REPAIRS]: { label: 'Repairs', hint: 'Quotes, next steps', icon: Wrench, tone: 'bg-amber-500/12 text-amber-700' },
  [NEEDS_YOU_GROUP.LEASES]: { label: 'Leases', hint: 'Applicants, ends of lease', icon: Building2, tone: 'bg-violet-500/12 text-violet-700' },
  [NEEDS_YOU_GROUP.OTHER]: { label: 'Other', hint: 'Inspections, messages', icon: MessageSquare, tone: 'bg-sky-500/12 text-sky-700' },
};

/** Categories drawn in the destructive tone: the risk the briefing leads with. */
export const SERVER_BRIEFING_URGENT: readonly GiiServerBriefingCategory[] = [
  SERVER_BRIEFING_CATEGORY.URGENT_REPAIR,
  SERVER_BRIEFING_CATEGORY.ARREARS,
];

/** Plain words for a briefing part that could not be read, in the greeting's warning line. */
export const SERVER_BRIEFING_UNAVAILABLE_LABEL: Record<string, string> = {
  [SERVER_BRIEFING_CATEGORY.URGENT_REPAIR]: 'urgent repairs',
  [SERVER_BRIEFING_CATEGORY.ARREARS]: 'arrears',
  [SERVER_BRIEFING_CATEGORY.QUOTE_WAITING]: 'quotes',
  [SERVER_BRIEFING_CATEGORY.APPLICATION_APPROVAL]: 'applications',
  [SERVER_BRIEFING_CATEGORY.END_LEASING]: 'ends of lease',
  [SERVER_BRIEFING_CATEGORY.RENT_REVIEW]: 'rent reviews',
  [SERVER_BRIEFING_CATEGORY.REPAIR_NEXT_STEP]: 'repairs',
  [SERVER_BRIEFING_CATEGORY.INSPECTION]: 'inspections',
  [SERVER_BRIEFING_CATEGORY.UNANSWERED_MESSAGE]: 'messages',
  [SERVER_BRIEFING_CATEGORY.LEASE_EXPIRING]: 'lease end dates',
  /** The server's name for the "changes since last briefing" part. */
  changes: 'updates since your last briefing',
};

/** Updates named in the greeting before the rest are counted. */
export const SERVER_BRIEFING_CHANGES_NAMED = 3;

/** Icon per Tasks page category, for the "Needs My Action" tasks listed under the server's items. */
export const TASK_BRIEFING_ICON: Record<TaskListV2Row['category'], LucideIcon> = {
  maintenance: Wrench,
  inspection: ClipboardList,
  leasing: Building2,
  rent_review: FileText,
  tribunal: Gavel,
};

/** A task at this priority is drawn in the destructive tone, like an urgent repair. */
export const BRIEFING_URGENT_PRIORITY: Priority = 'urgent';

/** How the greeting counts those tasks: alone ("2 tasks") or after the server's ("2 other tasks"). */
export const BRIEFING_TASK_NOUN = {
  ONE: 'task',
  MANY: 'tasks',
  OTHER_ONE: 'other task',
  OTHER_MANY: 'other tasks',
} as const;

/**
 * The first suggested question on Cros's Today tab. It sends the briefing's rows with it, unseen,
 * so Cros goes through the same list the card shows instead of guessing from a count.
 */
export const CROS_TODAY_QUESTION = {
  ID: 'today',
  LABEL: 'What needs me today?',
  TEXT: 'What needs me today?',
  CONTEXT_LABEL: "today's briefing, as the agent sees it",
  CONTEXT_LEAD: (total: number) =>
    `The agent's briefing lists ${total} ${total === 1 ? 'thing' : 'things'} for today, most urgent first. ` +
    'Go through them in this order, briefly, and say what to do first. Do not add, drop or recount rows.',
} as const;
