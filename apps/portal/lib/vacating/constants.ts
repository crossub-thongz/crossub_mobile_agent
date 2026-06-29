import {
  LEASING_ITEM_STATUS,
  LEASING_ITEM_STATUS_TONE,
  LEASING_TONE_DOT,
  LEASING_UI,
  type LeasingItemStatus,
  type LeasingTone,
} from '@/lib/leasing/constants';

export const VACATING_LIFECYCLE_STEP = {
  VACATE_NOTICE: 'vacate_notice',
  OUTGOING_INSPECTION: 'outgoing_inspection',
  EXIT_CLEANING: 'exit_cleaning',
  KEYS_RETURNED: 'keys_returned',
  UTILITIES_MAINTENANCE: 'utilities_maintenance',
  BOND_CLAIM: 'bond_claim',
} as const;

export type VacatingLifecycleStep =
  (typeof VACATING_LIFECYCLE_STEP)[keyof typeof VACATING_LIFECYCLE_STEP];

export const VACATING_LIFECYCLE_STEP_ORDER: VacatingLifecycleStep[] = [
  VACATING_LIFECYCLE_STEP.VACATE_NOTICE,
  VACATING_LIFECYCLE_STEP.OUTGOING_INSPECTION,
  VACATING_LIFECYCLE_STEP.EXIT_CLEANING,
  VACATING_LIFECYCLE_STEP.KEYS_RETURNED,
  VACATING_LIFECYCLE_STEP.UTILITIES_MAINTENANCE,
  VACATING_LIFECYCLE_STEP.BOND_CLAIM,
];

export const VACATING_LIFECYCLE_STEP_LABEL: Record<VacatingLifecycleStep, string> = {
  [VACATING_LIFECYCLE_STEP.VACATE_NOTICE]: 'Vacate Notice',
  [VACATING_LIFECYCLE_STEP.OUTGOING_INSPECTION]: 'Outgoing Inspection',
  [VACATING_LIFECYCLE_STEP.EXIT_CLEANING]: 'Exit Cleaning',
  [VACATING_LIFECYCLE_STEP.KEYS_RETURNED]: 'Keys Returned',
  [VACATING_LIFECYCLE_STEP.UTILITIES_MAINTENANCE]: 'Utilities & Maintenance',
  [VACATING_LIFECYCLE_STEP.BOND_CLAIM]: 'Bond Claim',
};

/** Compact labels for the horizontal workflow stepper. */
export const VACATING_LIFECYCLE_STEP_SHORT_LABEL: Record<VacatingLifecycleStep, string> = {
  [VACATING_LIFECYCLE_STEP.VACATE_NOTICE]: 'Notice',
  [VACATING_LIFECYCLE_STEP.OUTGOING_INSPECTION]: 'Outgoing',
  [VACATING_LIFECYCLE_STEP.EXIT_CLEANING]: 'Cleaning',
  [VACATING_LIFECYCLE_STEP.KEYS_RETURNED]: 'Keys',
  [VACATING_LIFECYCLE_STEP.UTILITIES_MAINTENANCE]: 'Utilities',
  [VACATING_LIFECYCLE_STEP.BOND_CLAIM]: 'Bond',
};

export const VACATING_CHECKLIST_LABEL: Record<VacatingLifecycleStep, string> = {
  [VACATING_LIFECYCLE_STEP.VACATE_NOTICE]: 'Notice confirmed',
  [VACATING_LIFECYCLE_STEP.OUTGOING_INSPECTION]: 'Outgoing inspection',
  [VACATING_LIFECYCLE_STEP.EXIT_CLEANING]: 'Exit cleaning',
  [VACATING_LIFECYCLE_STEP.KEYS_RETURNED]: 'Keys returned',
  [VACATING_LIFECYCLE_STEP.UTILITIES_MAINTENANCE]: 'Utilities & maintenance',
  [VACATING_LIFECYCLE_STEP.BOND_CLAIM]: 'Bond claim',
};

export type VacatingChecklistStatus = 'done' | 'pending' | 'dispute';

export { LEASING_ITEM_STATUS as VACATING_ITEM_STATUS };
export type VacatingItemStatus = LeasingItemStatus;
export { LEASING_ITEM_STATUS_TONE as VACATING_ITEM_STATUS_TONE };
export { LEASING_TONE_DOT as VACATING_TONE_DOT };
export { LEASING_UI as VACATING_UI };
