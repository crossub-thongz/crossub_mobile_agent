/**
 * Self-Manage desktop module pages (Phase 0 shell): lanes, status → lane maps, pill tones and
 * page copy for Maintenance, Inspections and Leasing. Every other tier keeps the `/tasks`
 * redirect, so nothing here reaches them.
 *
 * Lane maps key on the API status enums (`constants/api-enums.ts`), so a new server value fails
 * the type-check here instead of silently landing in a lane.
 */

import {
  INSPECTION_STATUS,
  LEASING_LIFECYCLE_STEP,
  MAINTENANCE_STATUS,
  RENT_REVIEW_WORKFLOW_STATE,
} from '@/constants/api-enums';
import { LEASING_MAIN_STATUS } from '@/constants/leasing-relet-decision';
import type { Inspection } from '@/lib/types';
import type { ServerLeasingMainStatus } from '@/lib/leasing-cycle-types';

/** The "every lane" chip ahead of the lane chips. */
export const MODULE_LANE_ALL = 'all';
export type ModuleLaneAll = typeof MODULE_LANE_ALL;

/** Pill tone per lane. Tones use the app's semantic palette; pages never inline a hue. */
export const MODULE_LANE_TONE = {
  ATTENTION: 'attention',
  WAITING: 'waiting',
  ACTIVE: 'active',
  DONE: 'done',
  MUTED: 'muted',
} as const;
export type ModuleLaneTone = (typeof MODULE_LANE_TONE)[keyof typeof MODULE_LANE_TONE];

export const MODULE_LANE_TONE_CLASS: Record<ModuleLaneTone, string> = {
  attention: 'border-destructive/35 bg-destructive/10 text-destructive',
  waiting: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  active: 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  done: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  muted: 'border-border bg-muted/40 text-muted-foreground',
};

export type ModuleLaneDefinition<Lane extends string> = {
  id: Lane;
  label: string;
  tone: ModuleLaneTone;
};

// ---------------------------------------------------------------------------
// Maintenance — Needs action, Awaiting contractor, Awaiting tenant, In progress, Done
// ---------------------------------------------------------------------------

export const MAINTENANCE_LANE = {
  NEEDS_ACTION: 'needs_action',
  AWAITING_CONTRACTOR: 'awaiting_contractor',
  AWAITING_TENANT: 'awaiting_tenant',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
} as const;
export type MaintenanceLane = (typeof MAINTENANCE_LANE)[keyof typeof MAINTENANCE_LANE];

export const MAINTENANCE_LANES: readonly ModuleLaneDefinition<MaintenanceLane>[] = [
  { id: MAINTENANCE_LANE.NEEDS_ACTION, label: 'Needs action', tone: MODULE_LANE_TONE.ATTENTION },
  {
    id: MAINTENANCE_LANE.AWAITING_CONTRACTOR,
    label: 'Awaiting contractor',
    tone: MODULE_LANE_TONE.WAITING,
  },
  { id: MAINTENANCE_LANE.AWAITING_TENANT, label: 'Awaiting tenant', tone: MODULE_LANE_TONE.WAITING },
  { id: MAINTENANCE_LANE.IN_PROGRESS, label: 'In progress', tone: MODULE_LANE_TONE.ACTIVE },
  { id: MAINTENANCE_LANE.DONE, label: 'Done', tone: MODULE_LANE_TONE.DONE },
];

export type MaintenanceApiStatus = (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];

/**
 * Base lane per persisted status. `lib/module-workspace-lanes.ts` overrides it first for a quote
 * awaiting approval, a tenant-rejected case (Needs action) and visit times waiting on the tenant
 * (Awaiting tenant), which the status alone cannot show.
 */
export const MAINTENANCE_STATUS_LANE: Record<MaintenanceApiStatus, MaintenanceLane> = {
  // New job: triage and responsibility are the agent's call.
  [MAINTENANCE_STATUS.OPEN]: MAINTENANCE_LANE.NEEDS_ACTION,
  // Approved to proceed; the tradie quotes or books next.
  [MAINTENANCE_STATUS.APPROVED]: MAINTENANCE_LANE.AWAITING_CONTRACTOR,
  // Quote in hand, waiting on the agent's approval ("Quote approval").
  [MAINTENANCE_STATUS.QUOTING]: MAINTENANCE_LANE.NEEDS_ACTION,
  [MAINTENANCE_STATUS.SCHEDULED]: MAINTENANCE_LANE.IN_PROGRESS,
  // Invoice in; completion sign-off is wired in Phase 1, so it stays with the work for now.
  [MAINTENANCE_STATUS.INVOICED]: MAINTENANCE_LANE.IN_PROGRESS,
  [MAINTENANCE_STATUS.COMPLETED]: MAINTENANCE_LANE.DONE,
  [MAINTENANCE_STATUS.CANCELLED]: MAINTENANCE_LANE.DONE,
};

// ---------------------------------------------------------------------------
// Inspections — Upcoming, In progress, Awaiting sign-off, Completed (+ Cancelled)
// ---------------------------------------------------------------------------

export const INSPECTION_LANE = {
  UPCOMING: 'upcoming',
  IN_PROGRESS: 'in_progress',
  AWAITING_SIGN_OFF: 'awaiting_sign_off',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
} as const;
export type InspectionLane = (typeof INSPECTION_LANE)[keyof typeof INSPECTION_LANE];

export const INSPECTION_LANES: readonly ModuleLaneDefinition<InspectionLane>[] = [
  { id: INSPECTION_LANE.UPCOMING, label: 'Upcoming', tone: MODULE_LANE_TONE.WAITING },
  { id: INSPECTION_LANE.IN_PROGRESS, label: 'In progress', tone: MODULE_LANE_TONE.ACTIVE },
  {
    id: INSPECTION_LANE.AWAITING_SIGN_OFF,
    label: 'Awaiting sign-off',
    tone: MODULE_LANE_TONE.ATTENTION,
  },
  // Published reports and finished agency jobs (their sign-off is optional, 26 Oct 2026).
  { id: INSPECTION_LANE.PUBLISHED, label: 'Completed', tone: MODULE_LANE_TONE.DONE },
  { id: INSPECTION_LANE.CANCELLED, label: 'Cancelled', tone: MODULE_LANE_TONE.MUTED },
];

export type InspectionApiStatus = (typeof INSPECTION_STATUS)[keyof typeof INSPECTION_STATUS];

/**
 * A COMPLETED job that has also been approved moves on to Completed (see the lane helper), and
 * so does an agency-conducted Self-Manage job as soon as its report is in.
 */
export const INSPECTION_STATUS_LANE: Record<InspectionApiStatus, InspectionLane> = {
  [INSPECTION_STATUS.DRAFT]: INSPECTION_LANE.UPCOMING,
  [INSPECTION_STATUS.IN_PROGRESS]: INSPECTION_LANE.IN_PROGRESS,
  [INSPECTION_STATUS.FIRST_REVIEW]: INSPECTION_LANE.AWAITING_SIGN_OFF,
  [INSPECTION_STATUS.SECOND_REVIEW]: INSPECTION_LANE.AWAITING_SIGN_OFF,
  [INSPECTION_STATUS.COMPLETED]: INSPECTION_LANE.AWAITING_SIGN_OFF,
  [INSPECTION_STATUS.PUBLISHED]: INSPECTION_LANE.PUBLISHED,
  [INSPECTION_STATUS.CANCELLED]: INSPECTION_LANE.CANCELLED,
};

/** Open-viewing session rows carry no inspection status — their report state decides. */
export const INSPECTION_REPORT_STATUS_LANE: Record<Inspection['reportStatus'], InspectionLane> = {
  pending: INSPECTION_LANE.UPCOMING,
  uploaded: INSPECTION_LANE.AWAITING_SIGN_OFF,
  approved: INSPECTION_LANE.PUBLISHED,
  sent: INSPECTION_LANE.PUBLISHED,
};

// ---------------------------------------------------------------------------
// Leasing — cycles by main status
// ---------------------------------------------------------------------------

export const LEASING_LANE = {
  AWAITING_YOU: 'awaiting_you',
  PREPARING: 'preparing',
  LEASING: 'leasing',
  ONBOARDING: 'onboarding',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type LeasingLane = (typeof LEASING_LANE)[keyof typeof LEASING_LANE];

export const LEASING_LANES: readonly ModuleLaneDefinition<LeasingLane>[] = [
  { id: LEASING_LANE.AWAITING_YOU, label: 'Awaiting you', tone: MODULE_LANE_TONE.ATTENTION },
  { id: LEASING_LANE.PREPARING, label: 'Preparing', tone: MODULE_LANE_TONE.WAITING },
  { id: LEASING_LANE.LEASING, label: 'Leasing', tone: MODULE_LANE_TONE.ACTIVE },
  { id: LEASING_LANE.ONBOARDING, label: 'Onboarding', tone: MODULE_LANE_TONE.ACTIVE },
  { id: LEASING_LANE.COMPLETED, label: 'Completed', tone: MODULE_LANE_TONE.DONE },
  { id: LEASING_LANE.CANCELLED, label: 'Cancelled', tone: MODULE_LANE_TONE.MUTED },
];

export const LEASING_MAIN_STATUS_LANE: Record<ServerLeasingMainStatus, LeasingLane> = {
  [LEASING_MAIN_STATUS.AWAITING_CONFIRMATION]: LEASING_LANE.AWAITING_YOU,
  [LEASING_MAIN_STATUS.PREPARATION]: LEASING_LANE.PREPARING,
  [LEASING_MAIN_STATUS.PAUSED]: LEASING_LANE.PREPARING,
  [LEASING_MAIN_STATUS.ACTIVE_LEASING]: LEASING_LANE.LEASING,
  [LEASING_MAIN_STATUS.OFFER_PENDING]: LEASING_LANE.LEASING,
  [LEASING_MAIN_STATUS.ONBOARDING]: LEASING_LANE.ONBOARDING,
  [LEASING_MAIN_STATUS.KEY_HANDOVER]: LEASING_LANE.ONBOARDING,
  [LEASING_MAIN_STATUS.COMPLETED]: LEASING_LANE.COMPLETED,
  [LEASING_MAIN_STATUS.CANCELLED]: LEASING_LANE.CANCELLED,
};

/** Older payloads without a main status fall back to the lifecycle step id. */
export const LEASING_STEP_ID_LANE: Record<
  (typeof LEASING_LIFECYCLE_STEP)[keyof typeof LEASING_LIFECYCLE_STEP],
  LeasingLane
> = {
  [LEASING_LIFECYCLE_STEP.OPEN_INSPECTION]: LEASING_LANE.LEASING,
  [LEASING_LIFECYCLE_STEP.OPEN_REPORT]: LEASING_LANE.LEASING,
  [LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL]: LEASING_LANE.LEASING,
  [LEASING_LIFECYCLE_STEP.ONBOARDING]: LEASING_LANE.ONBOARDING,
};

// ---------------------------------------------------------------------------
// Page copy
// ---------------------------------------------------------------------------

export type ModuleWorkspaceCopy = {
  title: string;
  description: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  noMatchTitle: string;
  detailPlaceholder: string;
};

export const MAINTENANCE_WORKSPACE_COPY: ModuleWorkspaceCopy = {
  title: 'Maintenance',
  description: 'Every repair job across your portfolio, by what it is waiting on.',
  searchPlaceholder: 'Search address, job or tradie…',
  emptyTitle: 'No maintenance jobs yet',
  emptyDescription: 'Jobs logged by you or your tenants appear here.',
  noMatchTitle: 'No jobs match',
  detailPlaceholder: 'Select a job to see its summary and decisions.',
};

export const INSPECTIONS_WORKSPACE_COPY: ModuleWorkspaceCopy = {
  title: 'Inspections',
  description: 'Open, routine, ingoing and outgoing inspections from booking to published report.',
  searchPlaceholder: 'Search address, type or inspector…',
  emptyTitle: 'No inspections yet',
  emptyDescription: 'Inspections you order appear here.',
  noMatchTitle: 'No inspections match',
  detailPlaceholder: 'Select an inspection to see its summary and decisions.',
};

export const LEASING_WORKSPACE_COPY: ModuleWorkspaceCopy = {
  title: 'Leasing',
  description: 'Letting cycles from re-let confirmation to key handover.',
  searchPlaceholder: 'Search address or stage…',
  emptyTitle: 'No letting cycles yet',
  emptyDescription: 'Start a letting from a property to see it here.',
  noMatchTitle: 'No lettings match',
  detailPlaceholder: 'Select a letting to work on it here.',
};

/** The letting workspace inside the Leasing page's detail pane. */
export const LEASING_WORKSPACE_PANE_COPY = {
  title: 'Letting workspace',
  loading: 'Loading the letting…',
  closed: 'This letting is closed. Open the full job for its history and the tenancy.',
} as const;

// ---------------------------------------------------------------------------
// Leasing — tenancy reviews (rent reviews and lease renewals) by workflow state
// ---------------------------------------------------------------------------

export const TENANCY_REVIEW_LANE = {
  AWAITING_YOU: 'awaiting_you',
  AWAITING_TENANT: 'awaiting_tenant',
  FINALISING: 'finalising',
  COMPLETED: 'completed',
  CLOSED: 'closed',
} as const;
export type TenancyReviewLane = (typeof TENANCY_REVIEW_LANE)[keyof typeof TENANCY_REVIEW_LANE];

export const TENANCY_REVIEW_LANES: readonly ModuleLaneDefinition<TenancyReviewLane>[] = [
  { id: TENANCY_REVIEW_LANE.AWAITING_YOU, label: 'Awaiting you', tone: MODULE_LANE_TONE.ATTENTION },
  { id: TENANCY_REVIEW_LANE.AWAITING_TENANT, label: 'Awaiting tenant', tone: MODULE_LANE_TONE.WAITING },
  { id: TENANCY_REVIEW_LANE.FINALISING, label: 'Finalising', tone: MODULE_LANE_TONE.ACTIVE },
  { id: TENANCY_REVIEW_LANE.COMPLETED, label: 'Completed', tone: MODULE_LANE_TONE.DONE },
  { id: TENANCY_REVIEW_LANE.CLOSED, label: 'Closed', tone: MODULE_LANE_TONE.MUTED },
];

export type RentReviewApiState =
  (typeof RENT_REVIEW_WORKFLOW_STATE)[keyof typeof RENT_REVIEW_WORKFLOW_STATE];

export const TENANCY_REVIEW_STATE_LANE: Record<RentReviewApiState, TenancyReviewLane> = {
  [RENT_REVIEW_WORKFLOW_STATE.PENDING_CONFIRMATION]: TENANCY_REVIEW_LANE.AWAITING_YOU,
  [RENT_REVIEW_WORKFLOW_STATE.AGENT_REVIEW]: TENANCY_REVIEW_LANE.AWAITING_YOU,
  // A counter or a decline is back with the agency for the owner's instruction.
  [RENT_REVIEW_WORKFLOW_STATE.NEGOTIATION]: TENANCY_REVIEW_LANE.AWAITING_YOU,
  [RENT_REVIEW_WORKFLOW_STATE.TENANT_REJECTED]: TENANCY_REVIEW_LANE.AWAITING_YOU,
  [RENT_REVIEW_WORKFLOW_STATE.TENANT_NOTIFIED]: TENANCY_REVIEW_LANE.AWAITING_TENANT,
  [RENT_REVIEW_WORKFLOW_STATE.TENANT_ACCEPTED]: TENANCY_REVIEW_LANE.FINALISING,
  [RENT_REVIEW_WORKFLOW_STATE.ACCOUNTING]: TENANCY_REVIEW_LANE.FINALISING,
  [RENT_REVIEW_WORKFLOW_STATE.COMPLETED]: TENANCY_REVIEW_LANE.COMPLETED,
  [RENT_REVIEW_WORKFLOW_STATE.CANCELLED]: TENANCY_REVIEW_LANE.CLOSED,
  [RENT_REVIEW_WORKFLOW_STATE.POSTPONED]: TENANCY_REVIEW_LANE.CLOSED,
};

export const TENANCY_REVIEW_WORKSPACE_COPY: ModuleWorkspaceCopy = {
  title: 'Tenancy reviews',
  description: 'Rent reviews and lease renewals you run, from the pathway to the new rent.',
  searchPlaceholder: 'Search address or tenant…',
  emptyTitle: 'No tenancy reviews yet',
  emptyDescription: 'Start a rent review from a property to see it here.',
  noMatchTitle: 'No reviews match',
  detailPlaceholder: 'Select a review to work on it here.',
};

/** The Leasing page's two lists: lettings and tenancy reviews. */
export const LEASING_PAGE_VIEW = {
  LETTINGS: 'lettings',
  TENANCY_REVIEWS: 'tenancy_reviews',
} as const;
export type LeasingPageView = (typeof LEASING_PAGE_VIEW)[keyof typeof LEASING_PAGE_VIEW];

export const LEASING_PAGE_VIEW_LABEL: Record<LeasingPageView, string> = {
  [LEASING_PAGE_VIEW.LETTINGS]: 'Lettings',
  [LEASING_PAGE_VIEW.TENANCY_REVIEWS]: 'Tenancy reviews',
};

export const TENANCY_REVIEW_PANE_COPY = {
  title: 'Review workspace',
} as const;

export const MODULE_WORKSPACE_LABELS = {
  allLane: 'All',
  openFullDetail: 'Open full job',
  summary: 'Summary',
  decisions: 'Owner decisions',
  recordDecision: 'Record a decision',
  yourAgency: 'Your agency',
  noProperty: 'This job is not linked to a property, so no decision can be filed against it.',
  noValue: '—',
} as const;

/** Column and summary labels shared by the three module pages. */
export const MODULE_FIELD_LABELS = {
  status: 'Status',
  reference: 'Ref',
  property: 'Property',
  job: 'Job',
  type: 'Type',
  stage: 'Stage',
  tradie: 'Tradie',
  inspector: 'Inspector',
  conductedBy: 'Conducted by',
  quote: 'Quote',
  rent: 'Rent/wk',
  priority: 'Priority',
  logged: 'Logged',
  updated: 'Updated',
  scheduled: 'Scheduled',
  created: 'Created',
  available: 'Available',
  completed: 'Completed',
  description: 'Description',
  report: 'Report',
  tenant: 'Tenant',
  reviewDue: 'Review due',
} as const;
