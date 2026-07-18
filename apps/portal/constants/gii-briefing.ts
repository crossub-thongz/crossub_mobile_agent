import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  FileText,
  Gavel,
  Wallet,
  Wrench,
} from 'lucide-react';

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

/** Empty-state line — a friendly caught-up message, never a blank card. */
export const BRIEFING_EMPTY_COPY =
  "You're all caught up — nothing needs action right now.";
