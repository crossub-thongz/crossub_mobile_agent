/**
 * Canonical CROSSUB date/time display (en-AU).
 * Keep in sync with `crossub_web/apps/web/utils/format-datetime.ts`.
 *
 * - Date:        "13 Aug 2026"
 * - Date+time:   "13 Aug 2026, 8:00 pm"
 * - Time:        "8:00 pm"
 */
import { format, isValid, parseISO } from 'date-fns';

import { PROPERTY_TIME_ZONE } from '@/constants/time-zone';

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

/**
 * Wall-clock parts at the property (Sydney), whatever zone the browser is in. en-US gives the
 * same short month names date-fns prints ("Sep", not en-AU's "Sept").
 */
const PROPERTY_DATE_TIME_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: PROPERTY_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function propertyDateTimeParts(d: Date) {
  const parts = PROPERTY_DATE_TIME_PARTS.formatToParts(d);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${part('day')} ${part('month')} ${part('year')}`,
    time: `${part('hour')}:${part('minute')} ${part('dayPeriod').toLowerCase()}`,
  };
}

/** Date with time at the property (Sydney). Example: "9 Jun 2026, 3:30 pm". */
export function formatPropertyDateTime(input: Date | string): string {
  const d = toValidDate(input);
  if (!d) return fallbackDateLabel(input);
  const { date, time } = propertyDateTimeParts(d);
  return `${date}, ${time}`;
}

/** Time only at the property (Sydney). Example: "3:30 pm". */
export function formatPropertyTime(input: Date | string): string {
  const d = toValidDate(input);
  if (!d) return fallbackDateLabel(input);
  return propertyDateTimeParts(d).time;
}

const PROPERTY_DATE_NUMERIC = new Intl.DateTimeFormat('en-GB', {
  timeZone: PROPERTY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * DD/MM/YYYY at the property (Sydney). A bare YYYY-MM-DD is a calendar date and is only
 * reordered, so it never drifts a day; a timestamp is read in Sydney. "—" when absent.
 */
export function formatPropertyDateNumeric(input: Date | string | null | undefined): string {
  if (input == null) return '—';
  if (typeof input === 'string') {
    const match = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const d = toValidDate(input);
  if (!d) return fallbackDateLabel(input);
  return PROPERTY_DATE_NUMERIC.format(d);
}

export function dayKey(input: Date | string): string {
  const d = toValidDate(input);
  if (!d) return typeof input === 'string' ? input.slice(0, 10) || 'unknown' : 'unknown';
  return format(d, 'yyyy-MM-dd');
}
