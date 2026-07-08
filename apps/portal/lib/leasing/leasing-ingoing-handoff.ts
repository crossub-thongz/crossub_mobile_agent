import { addDays, format, getDay, startOfDay } from 'date-fns';

export const LEASING_INGOING_SCHEDULE_WINDOW_DAYS = 7;

/**
 * Default ingoing inspection time: within the 7 days before move-in, weekdays
 * preferred at 10:00 — mirrors crossub_web leasing-ingoing-handoff.
 */
export function suggestLeasingIngoingScheduledTime(
  moveInDate: string,
  referenceDate: Date = new Date(),
): string | null {
  const moveIn = startOfDay(new Date(moveInDate.slice(0, 10)));
  if (Number.isNaN(moveIn.getTime())) return null;

  const windowEnd = startOfDay(addDays(moveIn, -1));
  const today = startOfDay(referenceDate);

  if (windowEnd < today) return null;

  let scheduled = startOfDay(addDays(moveIn, -LEASING_INGOING_SCHEDULE_WINDOW_DAYS));
  const day = getDay(scheduled);
  if (day === 0) scheduled = addDays(scheduled, 1);
  else if (day === 6) scheduled = addDays(scheduled, 2);

  const windowStart = startOfDay(addDays(moveIn, -LEASING_INGOING_SCHEDULE_WINDOW_DAYS));
  const earliest = today > windowStart ? today : windowStart;
  if (scheduled < earliest) scheduled = earliest;

  while (getDay(scheduled) === 0 || getDay(scheduled) === 6) {
    scheduled = addDays(scheduled, 1);
    if (scheduled > windowEnd) return null;
  }

  if (scheduled > windowEnd) {
    scheduled = windowEnd;
    if (getDay(scheduled) === 0) scheduled = addDays(scheduled, -2);
    if (getDay(scheduled) === 6) scheduled = addDays(scheduled, -1);
    if (scheduled < earliest) return null;
  }

  return format(scheduled, "yyyy-MM-dd'T'10:00:00");
}
