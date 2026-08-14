/**
 * The agent confirms the time CROSSUB scheduled for their open inspection
 * (Geng Xu, 14 Aug 2026).
 *
 * > INSPECTOR确认时间后才给中介CONFIRM。不用写DUE DATE，只需要显示SCHEDULED DATE即可。
 * > 加上中介CONFIRMED的时间。如果中介没有CONFIRM就显示PENDING。
 *
 * ## The button appears only when pressing it would succeed
 *
 * The server refuses to record a confirmation until a time is set **and** an inspector is
 * on the job, and this card knows both facts already. Offering the button before then
 * would ask the agent to vouch for a viewing nobody has agreed to attend — they would tell
 * their landlord and their applicants that Saturday 10am is happening, with an unstaffed
 * row in a task pool standing behind it.
 *
 * ## Nothing here is the source of truth for *when* it was confirmed
 *
 * The timestamp comes back from the server. The handset's clock and the server's disagree,
 * and the server's is the one CROSSUB staff read off the Task Pool — stamping it locally
 * would put two different times on one event.
 */

export const OPEN_INSPECTION_CONFIRM_COPY = {
  /** The button, before the agent has confirmed. */
  ACTION: 'Confirm this time',
  BUSY: 'Confirming…',
  /** Fact-tile label for the confirmation state. */
  TILE_LABEL: 'Confirmed by you',
  /** Shown in the tile until they confirm — never blank, so it reads as outstanding. */
  PENDING: 'Pending',
  /** Under the button: what confirming actually means to the people downstream. */
  HELP: 'Confirms to CROSSUB that this time works. Your inspector and the task pool are updated.',
  /** There is a time but nobody is on the job yet. */
  AWAITING_INSPECTOR:
    'CROSSUB will ask you to confirm once an inspector has taken this open inspection.',
  /** No time set yet — nothing to confirm. */
  AWAITING_SCHEDULE: 'CROSSUB will send this time for your confirmation once it is set.',
  SUCCESS: 'Time confirmed — CROSSUB has been notified.',
  FAILURE: 'Could not confirm this time',
} as const;
