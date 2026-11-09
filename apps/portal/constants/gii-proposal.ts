/** The row a repair job card shows when it carries photos, as the API writes it. */
export const GII_PROPOSAL_PHOTOS_LABEL = 'Photos';

/** How many of the agent's messages the API looks through for a repair job's photos. */
export const GII_JOB_PHOTO_LOOKBACK_MESSAGES = 3;

/** Copy for the Confirm card Cros shows before it changes anything. */
export const GII_PROPOSAL_COPY = {
  EYEBROW: 'Waiting for your OK',
  CONFIRM: 'Confirm',
  CONFIRMING: 'Working…',
  CANCEL: 'Cancel',
  /** Added to the chat when the agent cancels, so Cros sees the answer on the next turn. */
  CANCELLED: 'Cancelled. Nothing was changed.',
  /** Shown when the confirm request itself fails (network, server down). */
  UNREACHABLE: "Couldn't reach Cros to confirm. Nothing was changed. Please try again.",
} as const;
