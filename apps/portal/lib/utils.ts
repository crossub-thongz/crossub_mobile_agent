import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatScheduledAt(iso?: string | null): string {
  if (!iso) return 'TBC';
  return `${formatDate(iso)} · ${formatTime(iso)}`;
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
  const timeFmt: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };
  const startTime = start.toLocaleTimeString('en-AU', timeFmt);

  if (!endIso) {
    return `${datePart} · ${startTime}`;
  }

  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) {
    return `${datePart} · ${startTime}`;
  }

  const sameDay = start.toDateString() === end.toDateString();
  const endTime = end.toLocaleTimeString('en-AU', timeFmt);
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

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-AU')}`;
}

/** Street + suburb + state + postcode for display and document matching. */
export function formatPropertyFullAddress(property: {
  address: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}): string {
  const parts = [
    property.address?.trim(),
    property.suburb?.trim(),
    property.state?.trim(),
    property.postcode?.trim(),
  ].filter(Boolean);
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
