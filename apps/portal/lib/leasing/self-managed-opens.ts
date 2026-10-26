import {
  LETTING_OPEN_DEFAULT_MINUTES,
  LETTING_OPEN_DEFAULT_START_HOUR,
  LETTING_OPEN_LIVE_STATUSES,
  LETTING_OPEN_STATUS,
  SELF_MANAGED_OPEN_COPY,
} from '@/constants/self-managed-open-inspections';
import type {
  AddLettingOpenInspectionInput,
  LettingOpenInspection,
} from '@/lib/crossub-api/agent-letting-open-client';
import { toDatetimeLocalValue } from '@/lib/inspections/outgoing-schedule';

/** Pure rules for the Self-Manage open list: what each open allows next. */

export function isLettingOpenLive(open: LettingOpenInspection): boolean {
  return LETTING_OPEN_LIVE_STATUSES.includes(open.status);
}

export function isLettingOpenCancelled(open: LettingOpenInspection): boolean {
  return open.status === LETTING_OPEN_STATUS.CANCELLED;
}

export function lettingOpenHasReport(open: LettingOpenInspection): boolean {
  return Boolean(open.reportGeneratedAt);
}

export function canStartLettingOpen(open: LettingOpenInspection): boolean {
  return (
    open.status === LETTING_OPEN_STATUS.SCHEDULED || open.status === LETTING_OPEN_STATUS.STARTING
  );
}

/** Started, or its start time has come: a report can describe it. */
export function lettingOpenHasBegun(open: LettingOpenInspection, now: Date = new Date()): boolean {
  return Boolean(open.openedAt) || new Date(open.startTime).getTime() <= now.getTime();
}

export function canGenerateLettingOpenReport(
  open: LettingOpenInspection,
  now: Date = new Date(),
): boolean {
  return !isLettingOpenCancelled(open) && !lettingOpenHasReport(open) && lettingOpenHasBegun(open, now);
}

/** Opens that still count, earliest first, and the cancelled ones apart. */
export function splitLettingOpens(opens: readonly LettingOpenInspection[]): {
  kept: LettingOpenInspection[];
  cancelled: LettingOpenInspection[];
} {
  const byStart = [...opens].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  return {
    kept: byStart.filter((open) => !isLettingOpenCancelled(open)),
    cancelled: byStart.filter(isLettingOpenCancelled),
  };
}

/** Opens a report step lists: every one held, or with a report. */
export function reportableLettingOpens(
  opens: readonly LettingOpenInspection[],
  now: Date = new Date(),
): LettingOpenInspection[] {
  return splitLettingOpens(opens).kept.filter(
    (open) => lettingOpenHasReport(open) || lettingOpenHasBegun(open, now),
  );
}

/**
 * The form's default window: the day after the latest open (or tomorrow), at the usual start
 * hour, for the usual length. `datetime-local` values in the browser's zone.
 */
export function defaultLettingOpenWindow(
  opens: readonly LettingOpenInspection[],
  now: Date = new Date(),
): { start: string; end: string } {
  const { kept } = splitLettingOpens(opens);
  const latest = kept[kept.length - 1];
  const anchor = latest && new Date(latest.startTime) > now ? new Date(latest.startTime) : now;
  const start = new Date(anchor);
  start.setDate(start.getDate() + 1);
  start.setHours(LETTING_OPEN_DEFAULT_START_HOUR, 0, 0, 0);
  const end = new Date(start.getTime() + LETTING_OPEN_DEFAULT_MINUTES * 60 * 1000);
  return {
    start: toDatetimeLocalValue(start.toISOString()),
    end: toDatetimeLocalValue(end.toISOString()),
  };
}

export type LettingOpenForm = {
  startLocal: string;
  endLocal: string;
  notes: string;
  hostUserId: string;
};

/** The add-open body, or an Error carrying the copy to show. */
export function buildAddLettingOpenInput(form: LettingOpenForm): AddLettingOpenInspectionInput {
  const start = new Date(form.startLocal);
  const end = new Date(form.endLocal);
  if (!form.startLocal || !form.endLocal || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(SELF_MANAGED_OPEN_COPY.windowRequired);
  }
  if (end <= start) throw new Error(SELF_MANAGED_OPEN_COPY.windowOrder);
  const notes = form.notes.trim();
  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    ...(notes ? { notes } : {}),
    ...(form.hostUserId ? { hostUserId: form.hostUserId } : {}),
  };
}

export function lettingOpenReportFilename(open: LettingOpenInspection): string {
  return SELF_MANAGED_OPEN_COPY.reportFilename(open.startTime.slice(0, 10));
}
