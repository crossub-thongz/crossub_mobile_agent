import { PROPERTY_TIME_ZONE } from '@/constants/time-zone';

const DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Milliseconds the zone is ahead of UTC at the given instant. */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instantMs));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * A `datetime-local` value (`YYYY-MM-DDTHH:mm`) read as a wall-clock time at the property
 * (Sydney), whatever zone the browser is in, as an ISO instant. Returns null when the value is
 * not a valid `datetime-local` string.
 */
export function propertyWallClockToIso(local: string): string | null {
  const match = DATETIME_LOCAL.exec(local.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(wallAsUtc)) return null;
  // Two passes so a time next to a daylight-saving change takes the offset in force then.
  const firstGuess = wallAsUtc - zoneOffsetMs(wallAsUtc, PROPERTY_TIME_ZONE);
  const instant = wallAsUtc - zoneOffsetMs(firstGuess, PROPERTY_TIME_ZONE);
  return new Date(instant).toISOString();
}
