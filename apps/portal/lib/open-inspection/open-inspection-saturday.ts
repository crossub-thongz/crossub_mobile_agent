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
