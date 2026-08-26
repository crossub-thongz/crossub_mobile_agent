/**
 * Canonical CROSSUB date/time display (en-AU).
 * Keep in sync with `crossub_web/apps/web/utils/format-datetime.ts`.
 *
 * - Date:        "13 Aug 2026"
 * - Date+time:   "13 Aug 2026, 8:00 pm"
 * - Time:        "8:00 pm"
 */
import { format, isValid, parseISO } from 'date-fns';

export function toDate(input: Date | string): Date {
  return typeof input === 'string' ? parseISO(input) : input;
}

export function toValidDate(input: Date | string): Date | null {
  const d = toDate(input);
  return isValid(d) ? d : null;
}

function fallbackDateLabel(input: Date | string): string {
  if (typeof input === 'string' && input.trim()) return input.trim();
  return '—';
}

/** Calendar date. Example: "9 Jun 2026". */
export function formatDateMedium(input: Date | string): string {
  const d = toValidDate(input);
  if (!d) return fallbackDateLabel(input);
  return format(d, 'd MMM yyyy');
}

export const formatDate = formatDateMedium;

/** Calendar date from a YYYY-MM-DD agreement field, without timezone drift. */
export function formatAgreementDate(isoDate: string): string {
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate.trim();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return isoDate.trim();
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Tenancy agreement period for invoice property rows. */
export function formatAgreementPeriod(
  start?: string | null,
  end?: string | null,
): string {
  if (start && end) {
    return `Agreement ${formatAgreementDate(start)} – ${formatAgreementDate(end)}`;
  }
  if (start) return `Agreement from ${formatAgreementDate(start)}`;
  if (end) return `Agreement ends ${formatAgreementDate(end)}`;
  return 'No current agreement';
}

/** Date with time. Example: "9 Jun 2026, 3:30 pm". */
export function formatDateTimeMedium(input: Date | string): string {
  const d = toValidDate(input);
  if (!d) return fallbackDateLabel(input);
  return format(d, 'd MMM yyyy, h:mm aaa');
}

export const formatDateTime = formatDateTimeMedium;

/** Time only. Example: "3:30 pm". */
export function formatTimeShort(input: Date | string): string {
  const d = toValidDate(input);
  if (!d) return fallbackDateLabel(input);
  return format(d, 'h:mm aaa');
}

export const formatTime = formatTimeShort;

export function dayKey(input: Date | string): string {
  const d = toValidDate(input);
  if (!d) return typeof input === 'string' ? input.slice(0, 10) || 'unknown' : 'unknown';
  return format(d, 'yyyy-MM-dd');
}
