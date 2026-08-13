/**
 * The weekly OPEN batch, as it affects an agent.
 *
 * An open inspection is no longer something the agent schedules. They flag a property as
 * needing one; it joins the batch that closes at noon on Wednesday; inspectors then pick
 * the properties they can cover, the system works out a route across those picks, and the
 * inspector confirms a time. The agent hears the time once, at the end.
 *
 * The reason for the change is worth knowing when reading the copy below: when the agent
 * set the time, two properties forty minutes apart could be advertised for the same
 * quarter hour with no inspector on either, and nobody found out until Saturday.
 */

/** Every open time is Sydney wall-clock, whatever zone the handset is in. */
export const OPEN_BATCH_TIMEZONE = 'Australia/Sydney';

/**
 * Shown wherever an open time would go, when there is not one yet.
 *
 * The single most important string here. A property waiting in the pool still carries a
 * stored time — a placeholder, because the underlying record cannot hold an empty one —
 * and it looks exactly like a real Saturday slot. An agent who sees it will advertise it.
 */
export const OPEN_TIME_PENDING_LABEL = 'Awaiting inspector';

/** The longer form, for panels with room to explain. */
export const OPEN_TIME_PENDING_DESCRIPTION =
  'This property is in the weekly open pool. An inspector picks it up on Wednesday and ' +
  'confirms the time — you will be emailed as soon as it is set.';

/** Header + helper copy for the request panel. */
export const OPEN_REQUEST_TITLE = 'Request Open Inspection';

export const OPEN_REQUEST_DESCRIPTION =
  'Add this property to the weekly open list. Requests close at 12:00pm Wednesday; ' +
  'inspectors choose their properties that afternoon and the open times are set from the ' +
  'route they can actually drive. CROSSUB opens run on Saturdays.';

/**
 * Sits next to the optional time field.
 *
 * Says plainly that the time is a preference. An agent who believes they booked a slot and
 * finds out on Saturday that it moved has been misled by the form, not by the roster.
 */
export const OPEN_PREFERRED_TIME_HINT =
  'Optional. We will try to match it, but the final time comes from the inspector’s route ' +
  'for that Saturday — you will be told the confirmed time either way.';

/** Success toast after a request is lodged. */
export const OPEN_REQUEST_SUBMITTED =
  'Added to the open list — you will be emailed once an inspector confirms the time';

/** Advertising guard: nothing to advertise until a real time exists. */
export const OPEN_ADVERTISE_BLOCKED_PENDING =
  'Wait for the confirmed time before advertising — the time shown is not final yet.';
