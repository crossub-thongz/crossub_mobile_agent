import type { Inspection } from '@/lib/types';
import type { LeasingOpenInspection, LeasingPropertyDetail } from '@/lib/leasing/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

export const OPEN_INSPECTION_PENDING = 'Pending';

export function isAssignedInspectorName(name?: string | null): boolean {
  if (!name?.trim()) return false;
  const normalized = name.trim().toLowerCase();
  return ![
    'pending',
    'pending assignment',
    'pending — task pool',
    'task pool',
    'pending - task pool',
  ].includes(normalized);
}

export { needsOpenInspectionScheduleRequest } from '@/lib/open-inspection-resolve';

export function resolveOpenInspectionForProperty(
  inspections: Inspection[],
  propertyId: string,
  viewingSessionId?: string,
  inspectionId?: string,
): Inspection | undefined {
  if (inspectionId) {
    const linked = inspections.find((i) => i.id === inspectionId);
    if (linked) return linked;
  }
  if (viewingSessionId) {
    const linked = inspections.find((i) => i.id === viewingSessionId);
    if (linked) return linked;
  }
  return inspections.find(
    (i) =>
      i.propertyId === propertyId &&
      i.type === 'OPEN' &&
      i.status.toLowerCase() !== 'deleted' &&
      !i.status.toLowerCase().includes('cancel'),
  );
}

/**
 * Is this open still waiting for an inspector to set the time?
 *
 * The guard behind every screen that shows an open time. A property in the weekly pool
 * carries a stored `scheduledTime` that is a PLACEHOLDER, not a decision — it reads
 * exactly like a real Saturday slot, and an agent who sees one will put it in a listing.
 *
 * Written as a positive check on the flag rather than `!timeConfirmedAt`, because every
 * open that predates the weekly batch carries neither field; treating those as pending
 * would relabel historical viewings as unscheduled.
 */
export function isOpenTimePending(oi: LeasingOpenInspection): boolean {
  if (oi.timeProvisional === true) return true;
  return !oi.scheduledTime;
}

/**
 * Staff-confirmed schedule wins over agent preference for progress and display.
 *
 * A provisional `scheduledTime` is skipped rather than preferred — it is a placeholder,
 * and falling through to the agent's own requested time is both more truthful and more
 * useful to them while they wait.
 */
export function resolveEffectiveOpenInspectionStart(
  oi: LeasingOpenInspection,
): string | undefined {
  if (isOpenTimePending(oi)) return oi.preferredScheduledTime;
  return oi.scheduledTime ?? oi.preferredScheduledTime;
}

export function resolveEffectiveOpenInspectionEnd(
  oi: LeasingOpenInspection,
): string | undefined {
  return oi.scheduledTimeEnd ?? oi.preferredScheduledTimeEnd;
}

export function openInspectionStartReached(
  oi: LeasingOpenInspection,
  now: Date = new Date(),
): boolean {
  const start = resolveEffectiveOpenInspectionStart(oi);
  if (!start) return false;
  return new Date(start) <= now;
}

function isSameCalendarDay(start: string, end: string): boolean {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate()
  );
}

export function formatInspectionTimeRange(
  start?: string,
  end?: string,
): string {
  if (!start) return OPEN_INSPECTION_PENDING;
  const startLabel = `${formatDate(start)} · ${formatTime(start)}`;
  if (!end) return startLabel;
  if (isSameCalendarDay(start, end)) {
    return `${startLabel} – ${formatTime(end)}`;
  }
  return `${startLabel} – ${formatDate(end)} · ${formatTime(end)}`;
}

export function formatInspectionDurationHours(
  start?: string,
  end?: string,
): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const hours = ms / (60 * 60 * 1000);
  if (hours === 1) return '1 hour';
  if (Number.isInteger(hours)) return `${hours} hours`;
  return `${hours.toFixed(1)} hours`;
}

type OpenInspectionEarlyStartSource = {
  startedEarly?: boolean;
  startedEarlyAt?: string;
  originalScheduledStart?: string;
};

/** Human label when the inspector began before the originally scheduled window. */
export function formatOpenInspectionEarlyStartNotice(
  source: OpenInspectionEarlyStartSource,
): string | null {
  if (!source.startedEarly) return null;
  const original = source.originalScheduledStart;
  const startedAt = source.startedEarlyAt;
  if (original && startedAt) {
    return `Inspector started early at ${formatTime(startedAt)} (originally scheduled from ${formatTime(original)})`;
  }
  if (startedAt) {
    return `Inspector started early at ${formatTime(startedAt)}`;
  }
  return 'Inspector started early';
}

export function canCancelLetting(
  detail: LeasingPropertyDetail,
  linkedInspection?: { scheduledAt?: string; inspector?: string },
): boolean {
  const oi = detail.openInspection;
  const timePending = !(oi.scheduledTime ?? linkedInspection?.scheduledAt);
  const inspectorPending = !isAssignedInspectorName(
    oi.inspectorName ?? linkedInspection?.inspector,
  );
  return timePending && inspectorPending;
}

export function formatLettingRent(rentPerWeek?: number): string {
  if (rentPerWeek == null || rentPerWeek <= 0) return '—';
  return `${formatCurrency(rentPerWeek)}/wk`;
}

export function formatTenantMovedOutDate(detail: LeasingPropertyDetail): string {
  const { rental } = detail;
  if (rental.tenantMovedOut === false) return 'Tenant still in property';
  if (rental.tenantMovedOutDate) return formatDate(rental.tenantMovedOutDate);
  if (rental.tenantMovedOut === true) return '—';
  return OPEN_INSPECTION_PENDING;
}
