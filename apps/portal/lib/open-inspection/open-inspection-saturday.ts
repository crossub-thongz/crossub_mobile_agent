const SYDNEY_TZ = 'Australia/Sydney';

/** True when the instant falls on a Saturday in Australia/Sydney. */
export function isSaturdayInSydney(date: Date): boolean {
  const weekday = date.toLocaleDateString('en-AU', {
    timeZone: SYDNEY_TZ,
    weekday: 'long',
  });
  return weekday === 'Saturday';
}

/** Validate datetime-local value for CROSSUB (Saturday) open scheduling. */
export function validateCrossubOpenDateTimeLocal(
  value: string,
  label: string,
): string | null {
  if (!value) return `${label} is required`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${label} is invalid`;
  if (!isSaturdayInSydney(date)) {
    return `${label} must be on a Saturday — CROSSUB conducts Saturday opens only`;
  }
  return null;
}

/** Validate datetime-local for agent self-conducted open (not Saturday). */
export function validateSelfOpenDateTimeLocal(value: string, label: string): string | null {
  if (!value) return `${label} is required`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${label} is invalid`;
  if (isSaturdayInSydney(date)) {
    return `${label} cannot be on a Saturday — choose Schedule open inspection (CROSSUB) instead`;
  }
  return null;
}

export function openScheduleModeFromStartLocal(
  startLocal: string,
): 'crossub' | 'self' | null {
  if (!startLocal) return null;
  const date = new Date(startLocal);
  if (Number.isNaN(date.getTime())) return null;
  return isSaturdayInSydney(date) ? 'crossub' : 'self';
}

export function formatCalendarDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sydneyTodayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: SYDNEY_TZ });
}

/** True when this calendar day is a future (or today) Saturday in Sydney. */
export function isSelectableOpenSaturday(date: Date): boolean {
  if (!isSaturdayInSydney(date)) return false;
  return formatCalendarDateKey(date) >= sydneyTodayKey();
}

export function parseDatetimeLocalParts(value: string): {
  date: Date | undefined;
  time: string;
} {
  if (!value) return { date: undefined, time: '' };
  const [datePart, timePart] = value.split('T');
  if (!datePart) return { date: undefined, time: timePart?.slice(0, 5) ?? '' };
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return { date: undefined, time: timePart?.slice(0, 5) ?? '' };
  return {
    date: new Date(year, month - 1, day),
    time: timePart?.slice(0, 5) ?? '',
  };
}

export function combineDatetimeLocal(dateKey: string, time: string): string {
  return `${dateKey}T${time}`;
}

export function formatDatetimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function addHoursToDatetimeLocal(startLocal: string, hours: number): string {
  const start = new Date(startLocal);
  return formatDatetimeLocal(new Date(start.getTime() + hours * 60 * 60 * 1000));
}
