import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import {
  dayKey,
  formatAgreementPeriod,
  formatDate,
  formatDateMedium,
  formatDateTime,
  formatDateTimeMedium,
  formatTime,
  formatTimeShort,
} from '@/lib/format-datetime';

export {
  dayKey,
  formatAgreementPeriod,
  formatDate,
  formatDateMedium,
  formatDateTime,
  formatDateTimeMedium,
  formatTime,
  formatTimeShort,
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function displayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

/** Local calendar YYYY-MM-DD (avoids UTC day-shift from `toISOString()`). */
function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calendar days from `isoDate` through today (local).
 * Past dates → positive; today/future → 0; unknown → null.
 */
export function daysSinceDate(isoDate: string | null | undefined): number | null {
  if (!isoDate?.trim()) return null;
  const key = isoDate.trim().slice(0, 10);
  const start = new Date(`${key}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const todayStart = new Date(`${localDateKey()}T00:00:00`);
  const diffMs = todayStart.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

/** Calendar days until `isoDate` (local). Today → 0; past → negative; unknown → null. */
export function daysUntilDate(isoDate: string | null | undefined): number | null {
  if (!isoDate?.trim()) return null;
  const key = isoDate.trim().slice(0, 10);
  const target = new Date(`${key}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const todayStart = new Date(`${localDateKey()}T00:00:00`);
  return Math.floor((target.getTime() - todayStart.getTime()) / 86_400_000);
}

/** Bond vacate days — null when agreement end is still in the future. */
export function daysSinceVacate(isoDate: string | null | undefined): number | null {
  if (!isoDate?.trim()) return null;
  const key = isoDate.trim().slice(0, 10);
  const end = new Date(`${key}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const todayStart = new Date(`${localDateKey()}T00:00:00`);
  if (end.getTime() > todayStart.getTime()) return null;
  return Math.floor((todayStart.getTime() - end.getTime()) / 86_400_000);
}

export function formatScheduledAt(iso?: string | null): string {
  if (!iso) return 'TBC';
  return formatDateTime(iso);
}

/** Key collection / open inspection window for display cards. */
export function formatOpenInspectionWindow(
  startIso?: string,
  endIso?: string,
): string | null {
  if (!startIso) return null;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;

  const datePart = start.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const startTime = formatTime(start);

  if (!endIso) {
    return `${datePart} · ${startTime}`;
  }

  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) {
    return `${datePart} · ${startTime}`;
  }

  const sameDay = dayKey(start) === dayKey(end);
  const endTime = formatTime(end);
  if (sameDay) {
    return `${datePart} · ${startTime} – ${endTime}`;
  }

  const endDatePart = end.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${datePart} · ${startTime} – ${endDatePart} · ${endTime}`;
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

/** Parse API/Prisma money fields that may arrive as strings or odd JSON shapes. */
export function coerceMoney(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatCurrency(amount: number | null | undefined): string {
  const n = coerceMoney(amount);
  if (n == null) return '—';
  return `$${n.toLocaleString('en-AU')}`;
}

/** Street + suburb + state + postcode for display and document matching. */
export function formatPropertyFullAddress(property: {
  address: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}): string {
  // Many legacy rows already embed suburb/state/postcode in `address` — don't duplicate.
  const street = property.address?.trim() ?? '';
  if (!street) return '';
  const parts: string[] = [street];
  const joined = () => parts.join(', ').toLowerCase();
  const suburb = property.suburb?.trim() ?? '';
  const statePost = [property.state?.trim(), property.postcode?.trim()]
    .filter(Boolean)
    .join(' ');
  if (suburb && !joined().includes(suburb.toLowerCase())) parts.push(suburb);
  if (statePost && !joined().includes(statePost.toLowerCase())) parts.push(statePost);
  return parts.join(', ');
}

export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${mm}/${d.getFullYear()}`;
}

export function formatLeasePeriodMonthYear(start: string, end: string): string {
  return `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
}
