/**
 * Manual close reasons — the "close a job that should not proceed" path.
 *
 * Mirrors the API's `apps/api/src/constants/maintenance-close.constants.ts` (the fixed set the
 * `POST /maintenance/requests/:id/close` DTO validates against). Kept as a runtime constant here
 * rather than reaching for the contract's string-literal *type* so the picker can iterate the
 * options and the "no raw string comparisons" rule holds. Keep in sync with the API.
 *
 * A cancelled job and a completed one both sit at status `closed`; the reason is what keeps the
 * two tellable apart afterwards, which is why it is a required, closed set and `OTHER` carries a
 * note. The commitment warning (an assigned contractor, an approved quote, a booked visit) is
 * enforced by the API — a 409 that the dialog surfaces — not re-derived in the app.
 */

import type { MaintenanceWorkspaceStatus } from '@/lib/maintenance-workspace/types';

export const MAINTENANCE_CLOSE_REASON = {
  DUPLICATE: 'DUPLICATE',
  RAISED_IN_ERROR: 'RAISED_IN_ERROR',
  RESOLVED_BY_TENANT: 'RESOLVED_BY_TENANT',
  NO_LONGER_REQUIRED: 'NO_LONGER_REQUIRED',
  NOT_OUR_RESPONSIBILITY: 'NOT_OUR_RESPONSIBILITY',
  HANDLED_OUTSIDE_SYSTEM: 'HANDLED_OUTSIDE_SYSTEM',
  // Set only by the dedicated "Owner to Handle" quote action — the owner arranges the repair
  // directly. Deliberately absent from `MAINTENANCE_CLOSE_REASON_ORDER` so the manual Close job
  // picker keeps its own reasons and this one is never hand-picked there.
  HANDLED_BY_OWNER: 'HANDLED_BY_OWNER',
  OTHER: 'OTHER',
} as const;

export type MaintenanceCloseReason =
  (typeof MAINTENANCE_CLOSE_REASON)[keyof typeof MAINTENANCE_CLOSE_REASON];

export const MAINTENANCE_CLOSE_REASON_LABEL: Record<MaintenanceCloseReason, string> = {
  DUPLICATE: 'Duplicate of another job',
  RAISED_IN_ERROR: 'Raised in error',
  RESOLVED_BY_TENANT: 'Tenant resolved it themselves',
  NO_LONGER_REQUIRED: 'No longer required',
  NOT_OUR_RESPONSIBILITY: 'Not our responsibility',
  HANDLED_OUTSIDE_SYSTEM: 'Handled outside the system',
  HANDLED_BY_OWNER: 'Handled by owner',
  OTHER: 'Other',
};

/**
 * Tones for a closed-reason chip — the app's semantic palette, never an inline hue, both themes.
 * Surfaced wherever a closed job shows its reason. `HANDLED_BY_OWNER` reads as a settled outcome
 * handed off to the owner (the same sky tone the V2 payment lane uses for an external settlement);
 * the rest are neutral, since a cancelled/duplicate close carries no positive or negative weight.
 */
export const MAINTENANCE_CLOSE_REASON_TONE: Record<MaintenanceCloseReason, string> = {
  DUPLICATE: 'border-border bg-muted/40 text-muted-foreground',
  RAISED_IN_ERROR: 'border-border bg-muted/40 text-muted-foreground',
  RESOLVED_BY_TENANT: 'border-border bg-muted/40 text-muted-foreground',
  NO_LONGER_REQUIRED: 'border-border bg-muted/40 text-muted-foreground',
  NOT_OUR_RESPONSIBILITY: 'border-border bg-muted/40 text-muted-foreground',
  HANDLED_OUTSIDE_SYSTEM: 'border-border bg-muted/40 text-muted-foreground',
  HANDLED_BY_OWNER: 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  OTHER: 'border-border bg-muted/40 text-muted-foreground',
};

export const MAINTENANCE_CLOSE_REASON_ORDER: MaintenanceCloseReason[] = [
  MAINTENANCE_CLOSE_REASON.DUPLICATE,
  MAINTENANCE_CLOSE_REASON.RAISED_IN_ERROR,
  MAINTENANCE_CLOSE_REASON.RESOLVED_BY_TENANT,
  MAINTENANCE_CLOSE_REASON.NO_LONGER_REQUIRED,
  MAINTENANCE_CLOSE_REASON.NOT_OUR_RESPONSIBILITY,
  MAINTENANCE_CLOSE_REASON.HANDLED_OUTSIDE_SYSTEM,
  MAINTENANCE_CLOSE_REASON.OTHER,
];

/**
 * `OTHER` explains nothing on its own, so it has to carry a note — matching the API, which
 * refuses the close with a 400 otherwise.
 */
export const MAINTENANCE_CLOSE_REASON_REQUIRES_NOTE: MaintenanceCloseReason[] = [
  MAINTENANCE_CLOSE_REASON.OTHER,
];

export const MAINTENANCE_CLOSE_NOTE_MAX_LENGTH = 500;

/**
 * Workflow statuses where "Close job" is hidden — the job is already finished or gone, so there
 * is nothing left to close. `deleted` is the workflow value the app maps a cancelled/archived job
 * onto (see `maintenance-workspace/adapter.ts`). `completed` is shown as done in the header and
 * needs no manual close.
 */
export const MAINTENANCE_CLOSE_HIDDEN_STATUSES: MaintenanceWorkspaceStatus[] = [
  'completed',
  'closed',
  'deleted',
];
