export const LEASING_LIFECYCLE_STEP = {
  OPEN_INSPECTION: 'open_inspection',
  OPEN_REPORT: 'open_report',
  APPLICATION_APPROVAL: 'application_approval',
  ONBOARDING: 'onboarding',
} as const;

export type LeasingLifecycleStep =
  (typeof LEASING_LIFECYCLE_STEP)[keyof typeof LEASING_LIFECYCLE_STEP];

export const LEASING_LIFECYCLE_STEP_ORDER: LeasingLifecycleStep[] = [
  LEASING_LIFECYCLE_STEP.OPEN_INSPECTION,
  LEASING_LIFECYCLE_STEP.OPEN_REPORT,
  LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL,
  LEASING_LIFECYCLE_STEP.ONBOARDING,
];

export const LEASING_LIFECYCLE_STEP_LABEL: Record<LeasingLifecycleStep, string> = {
  [LEASING_LIFECYCLE_STEP.OPEN_INSPECTION]: 'Open Inspection & Arrangement',
  [LEASING_LIFECYCLE_STEP.OPEN_REPORT]: 'Open Report',
  [LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL]: 'Application + Approval',
  [LEASING_LIFECYCLE_STEP.ONBOARDING]: 'Onboarding Procedures',
};

/** Compact labels for the horizontal workflow stepper. */
export const LEASING_LIFECYCLE_STEP_SHORT_LABEL: Record<LeasingLifecycleStep, string> = {
  [LEASING_LIFECYCLE_STEP.OPEN_INSPECTION]: 'Inspection',
  [LEASING_LIFECYCLE_STEP.OPEN_REPORT]: 'Report',
  [LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL]: 'Approval',
  [LEASING_LIFECYCLE_STEP.ONBOARDING]: 'Onboard',
};

export const LEASING_ITEM_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  WAITING: 'waiting',
  BLOCKED: 'blocked',
  DONE: 'done',
} as const;

export type LeasingItemStatus =
  (typeof LEASING_ITEM_STATUS)[keyof typeof LEASING_ITEM_STATUS];

export const LEASING_ITEM_STATUS_LABEL: Record<LeasingItemStatus, string> = {
  [LEASING_ITEM_STATUS.NOT_STARTED]: 'Not started',
  [LEASING_ITEM_STATUS.IN_PROGRESS]: 'In progress',
  [LEASING_ITEM_STATUS.WAITING]: 'Waiting',
  [LEASING_ITEM_STATUS.BLOCKED]: 'Blocked',
  [LEASING_ITEM_STATUS.DONE]: 'Done',
};

export const LEASING_TONE = {
  SUCCESS: 'success',
  WARNING: 'warning',
  DESTRUCTIVE: 'destructive',
  INFO: 'info',
  MUTED: 'muted',
  DEFAULT: 'default',
} as const;

export type LeasingTone = (typeof LEASING_TONE)[keyof typeof LEASING_TONE];

export const LEASING_TONE_CLASS: Record<LeasingTone, string> = {
  [LEASING_TONE.SUCCESS]:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  [LEASING_TONE.WARNING]:
    'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  [LEASING_TONE.DESTRUCTIVE]:
    'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200',
  [LEASING_TONE.INFO]: 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  [LEASING_TONE.MUTED]: 'border-border/80 bg-muted/50 text-muted-foreground',
  [LEASING_TONE.DEFAULT]:
    'border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200',
};

export const LEASING_TONE_DOT: Record<LeasingTone, string> = {
  [LEASING_TONE.SUCCESS]: 'bg-emerald-600 dark:bg-emerald-400',
  [LEASING_TONE.WARNING]: 'bg-amber-600 dark:bg-amber-400',
  [LEASING_TONE.DESTRUCTIVE]: 'bg-rose-600 dark:bg-rose-400',
  [LEASING_TONE.INFO]: 'bg-sky-600 dark:bg-sky-400',
  [LEASING_TONE.MUTED]: 'bg-muted-foreground/60',
  [LEASING_TONE.DEFAULT]: 'bg-violet-600 dark:bg-violet-400',
};

export const LEASING_ITEM_STATUS_TONE: Record<LeasingItemStatus, LeasingTone> = {
  [LEASING_ITEM_STATUS.NOT_STARTED]: LEASING_TONE.MUTED,
  [LEASING_ITEM_STATUS.IN_PROGRESS]: LEASING_TONE.DEFAULT,
  [LEASING_ITEM_STATUS.WAITING]: LEASING_TONE.WARNING,
  [LEASING_ITEM_STATUS.BLOCKED]: LEASING_TONE.DESTRUCTIVE,
  [LEASING_ITEM_STATUS.DONE]: LEASING_TONE.SUCCESS,
};

export const LEASING_PILL_TEXT = {
  emerald: 'text-emerald-800 dark:text-emerald-200',
  amber: 'text-amber-800 dark:text-amber-200',
  rose: 'text-rose-800 dark:text-rose-200',
  sky: 'text-sky-800 dark:text-sky-200',
  violet: 'text-violet-800 dark:text-violet-200',
} as const;

export const LEASING_UI = {
  accentIcon: 'text-violet-700 dark:text-violet-300',
  btnSecondary:
    'bg-violet-500/15 text-violet-900 hover:bg-violet-500/25 dark:text-violet-100',
  tabActive: 'bg-violet-500/15 text-violet-900 shadow-none dark:text-violet-100',
  callout:
    'border-violet-500/20 bg-violet-500/[0.06] text-violet-900 dark:text-violet-100/90',
  link: 'text-violet-800 hover:text-violet-900 dark:text-violet-200',
  btnSuccess: 'bg-emerald-500/10 text-emerald-900 hover:bg-emerald-500/20 dark:text-emerald-200',
  stepAccent: 'bg-violet-500/10 text-violet-800 dark:text-violet-300',
} as const;

export const LEASING_KEY_CUSTODY = {
  CROSSUB: 'crossub',
  AGENT: 'agent',
} as const;

export type LeasingKeyCustody =
  (typeof LEASING_KEY_CUSTODY)[keyof typeof LEASING_KEY_CUSTODY];

export const LEASING_ADVERTISING_STATUS = {
  NOT_REQUESTED: 'not_requested',
  PENDING_INTEGRATION: 'pending_integration',
  PUBLISHED: 'published',
} as const;

export type LeasingAdvertisingStatus =
  (typeof LEASING_ADVERTISING_STATUS)[keyof typeof LEASING_ADVERTISING_STATUS];

export const LEASING_ADVERTISING_STATUS_LABEL: Record<LeasingAdvertisingStatus, string> = {
  [LEASING_ADVERTISING_STATUS.NOT_REQUESTED]: 'Not requested',
  [LEASING_ADVERTISING_STATUS.PENDING_INTEGRATION]: 'Pending listing integration',
  [LEASING_ADVERTISING_STATUS.PUBLISHED]: 'Published to portals',
};

export const LEASING_APPLY_PATH = {
  APP_DOWNLOAD: 'app_download',
  H5_WEB: 'h5_web',
} as const;

export type LeasingApplyPath =
  (typeof LEASING_APPLY_PATH)[keyof typeof LEASING_APPLY_PATH];

export const LEASING_APPLY_PATH_LABEL: Record<LeasingApplyPath, string> = {
  [LEASING_APPLY_PATH.APP_DOWNLOAD]: 'CROSSUB tenant app',
  [LEASING_APPLY_PATH.H5_WEB]: 'H5 web application',
};

export const LEASING_AGENT_DECISION = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type LeasingAgentDecision =
  (typeof LEASING_AGENT_DECISION)[keyof typeof LEASING_AGENT_DECISION];

export const LEASING_AGENT_DECISION_LABEL: Record<LeasingAgentDecision, string> = {
  [LEASING_AGENT_DECISION.PENDING]: 'Pending agent',
  [LEASING_AGENT_DECISION.APPROVED]: 'Approved',
  [LEASING_AGENT_DECISION.REJECTED]: 'Rejected',
};

export const LEASING_AGENT_DECISION_TONE: Record<LeasingAgentDecision, LeasingTone> = {
  [LEASING_AGENT_DECISION.PENDING]: LEASING_TONE.WARNING,
  [LEASING_AGENT_DECISION.APPROVED]: LEASING_TONE.SUCCESS,
  [LEASING_AGENT_DECISION.REJECTED]: LEASING_TONE.DESTRUCTIVE,
};
