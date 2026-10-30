/** Talk to a person (Jarvis 2.3): a Cros chat a CROSSUB person holds. */

/** How often the open panel asks for the team's replies while a person holds the chat. */
export const GII_HANDOFF_POLL_MS = 5_000;

/** The team, when nobody is named on the thread yet. */
export const GII_HANDOFF_TEAM = 'CROSSUB team';

/** Under this many minutes the wait reads in minutes; from it, in hours. */
export const GII_HANDOFF_WAIT_HOUR_MINUTES = 60;

export const GII_HANDOFF_COPY = {
  WITH: (name: string | null) => (name ? `With ${name}, ${GII_HANDOFF_TEAM}` : `With the ${GII_HANDOFF_TEAM}`),
  WAITING: (wait: string) => `Waiting ${wait}`,
  ANSWERED: 'Answered',
  BACK_FROM: (when: string) => `The team is back ${when} Sydney time`,
  CLOSED: (name: string | null) => `${name ?? `The ${GII_HANDOFF_TEAM}`} handed the chat back to Cros.`,
  PLACEHOLDER: (name: string | null) => `Message ${name ?? `the ${GII_HANDOFF_TEAM}`}…`,
  SEND_FAILED: 'Your message could not be sent to the CROSSUB team. Please try again.',
  CLOSED_ON_SEND: 'The CROSSUB team has already handed this chat back to Cros.',
} as const;
