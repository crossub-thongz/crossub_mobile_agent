import {
  addHoursToDatetimeLocal,
  validateCrossubOpenDateTimeLocal,
} from '@/lib/open-inspection/open-inspection-saturday';

/** The open-inspection duration assumed when an agent names a start but no end. */
const DEFAULT_OPEN_DURATION_HOURS = 1;

export type OpenPreferredWindow = {
  preferredStartTime?: string;
  preferredEndTime?: string;
};

/**
 * Turn whatever the agent typed into the *optional hint* the request carries.
 *
 * The whole of CRS-0068 sits in the first branch: **no time is a complete request.** The
 * agent flags a property as needing an open; the batch closes at noon on Wednesday; the
 * inspector picks what they can cover; the route decides the times; the agent is told at
 * the end. A form that refuses to submit without a time is the old flow wearing the new
 * flow's words, and it is what the create wizard was still doing after the request panel
 * had already been fixed.
 *
 * When the agent *does* name a time it is still validated — a Saturday hint that is not
 * on a Saturday helps nobody, and the route planner weighs it to anchor where the drive
 * begins. Validated, then sent as a preference, and never as a booking.
 *
 * Throws on a time that cannot be honoured, so the caller surfaces one clear message
 * rather than the server rejecting a shape the form could have caught.
 */
export function buildOpenPreferredWindow(
  startLocal: string,
  endLocal: string,
): OpenPreferredWindow {
  if (!startLocal) {
    // An end with no start is not a window — drop it rather than send half of one, which
    // the server would read as a preference it cannot place.
    return {};
  }

  const startError = validateCrossubOpenDateTimeLocal(
    startLocal,
    'Preferred date & time',
  );
  if (startError) throw new Error(startError);

  const resolvedEnd =
    endLocal || addHoursToDatetimeLocal(startLocal, DEFAULT_OPEN_DURATION_HOURS);

  const endError = validateCrossubOpenDateTimeLocal(resolvedEnd, 'Preferred end time');
  if (endError) {
    throw new Error('The viewing must start and finish on the same Saturday');
  }
  if (new Date(resolvedEnd) <= new Date(startLocal)) {
    throw new Error('Preferred end time must be after the start time');
  }

  return {
    preferredStartTime: new Date(startLocal).toISOString(),
    preferredEndTime: new Date(resolvedEnd).toISOString(),
  };
}
