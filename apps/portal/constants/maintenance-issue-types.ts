/**
 * Standard maintenance issue types — mirrors `crossub_web/apps/web/constants/maintenance-issue-types.ts`.
 */
export const MAINTENANCE_ISSUE_TYPE_OTHER = 'Others' as const;

export const MAINTENANCE_ISSUE_TYPES = [
  'Roofing Services',
  'Plumbing Issue',
  'End-of-lease Cleaning',
  'Gardening and Guttering',
  'Tap and Toilet Repair',
  'Locksmith',
  'General Cleaning',
  'Pest Control',
  'Washing Machine and Dryer Repair',
  'Air Conditioning Repair',
  'Painting and Decorating',
  'Door Repairs and Replacement',
  'Blinds and Window Repair',
  'Tiling Repair',
  'Rubbish Removal',
  'Tree and Stump Removal',
  'Gyprock Fixing',
  'Mould Cleaning',
  'Appliance Repairs and Installation',
  'Hot Water System Repair',
  'Electrical Services',
  'Flooding and Water Damages',
  'Carpet and Timber Floor Repair',
  'Shower Repair',
  'Cabinet Repair',
  'Carpet Cleaning',
  MAINTENANCE_ISSUE_TYPE_OTHER,
] as const;

export type MaintenanceIssueType = (typeof MAINTENANCE_ISSUE_TYPES)[number];

const ISSUE_TYPE_SET = new Set<string>(MAINTENANCE_ISSUE_TYPES);

export function isKnownMaintenanceIssueType(value: string): value is MaintenanceIssueType {
  return ISSUE_TYPE_SET.has(value);
}

export function parseMaintenanceIssueType(value: string): {
  selection: MaintenanceIssueType | '';
  otherDetail: string;
} {
  const trimmed = value.trim();
  if (!trimmed) return { selection: '', otherDetail: '' };
  if (isKnownMaintenanceIssueType(trimmed)) {
    if (trimmed === MAINTENANCE_ISSUE_TYPE_OTHER) {
      return { selection: MAINTENANCE_ISSUE_TYPE_OTHER, otherDetail: '' };
    }
    return { selection: trimmed, otherDetail: '' };
  }
  return { selection: MAINTENANCE_ISSUE_TYPE_OTHER, otherDetail: trimmed };
}

export function formatMaintenanceIssueType(selection: string, otherDetail: string): string {
  if (selection === MAINTENANCE_ISSUE_TYPE_OTHER) return otherDetail.trim();
  return selection.trim();
}

export function isMaintenanceIssueTypeValid(selection: string, otherDetail: string): boolean {
  if (!selection) return false;
  if (selection === MAINTENANCE_ISSUE_TYPE_OTHER) return otherDetail.trim().length > 0;
  return isKnownMaintenanceIssueType(selection);
}

/** Issue types where urgent can be set immediately (tenant + agent). */
export const TENANT_URGENT_MAINTENANCE_ISSUE_TYPES = [
  'Flooding and Water Damages',
  'Locksmith',
  'Electrical Services',
  'Hot Water System Repair',
] as const satisfies readonly MaintenanceIssueType[];

const TENANT_URGENT_ISSUE_TYPE_SET = new Set<string>(TENANT_URGENT_MAINTENANCE_ISSUE_TYPES);

export function isTenantUrgentEligibleMaintenanceIssueType(selection: string): boolean {
  return TENANT_URGENT_ISSUE_TYPE_SET.has(selection);
}
