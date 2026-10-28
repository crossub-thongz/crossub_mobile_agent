import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  Gavel,
  MessageSquare,
  Receipt,
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
  RENT_REVIEW: 'rent_review',
  INSPECTION: 'inspection',
  UNANSWERED_MESSAGE: 'unanswered_message',
  LEASE_EXPIRING: 'lease_expiring',
} as const satisfies Record<string, GiiServerBriefingCategory>;

/** Icon per server briefing category. */
export const SERVER_BRIEFING_ICON: Record<GiiServerBriefingCategory, LucideIcon> = {
  [SERVER_BRIEFING_CATEGORY.URGENT_REPAIR]: AlertTriangle,
  [SERVER_BRIEFING_CATEGORY.ARREARS]: Wallet,
  [SERVER_BRIEFING_CATEGORY.QUOTE_WAITING]: Receipt,
  [SERVER_BRIEFING_CATEGORY.RENT_REVIEW]: FileText,
  [SERVER_BRIEFING_CATEGORY.INSPECTION]: ClipboardList,
  [SERVER_BRIEFING_CATEGORY.UNANSWERED_MESSAGE]: MessageSquare,
  [SERVER_BRIEFING_CATEGORY.LEASE_EXPIRING]: CalendarClock,
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
  [SERVER_BRIEFING_CATEGORY.RENT_REVIEW]: 'rent reviews',
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
