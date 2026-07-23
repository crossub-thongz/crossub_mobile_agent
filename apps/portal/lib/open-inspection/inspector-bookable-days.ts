const SYDNEY_TZ = 'Australia/Sydney';

export function sydneyDateKeyFromLocalDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-CA', { timeZone: SYDNEY_TZ });
}

export function validateBookableDateTimeLocal(
  value: string,
  label: string,
  bookableDates: Set<string>,
): string | null {
  if (!value) return `${label} is required`;
  const dateKey = sydneyDateKeyFromLocalDateTime(value);
  if (!dateKey) return `Invalid ${label.toLowerCase()}`;
  if (!bookableDates.has(dateKey)) {
    return `${label} must fall on a day when an inspector is available`;
  }
  return null;
}

export function formatBookableDaysHint(dates: string[], max = 6): string {
  if (dates.length === 0) {
    return 'No inspector availability published yet — ask inspectors to set their weekly timetable.';
  }
  const sample = dates.slice(0, max).join(', ');
  const more = dates.length > max ? ` (+${dates.length - max} more)` : '';
  return `Available days include: ${sample}${more}`;
}
