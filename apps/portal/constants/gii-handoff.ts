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
  CLOSED_BY_ME: 'You ended the chat with the team. Cros answers again.',
  /** The notice when the team hands the chat back while the agent has the app open. */
  ENDED_LIVE: (name: string | null) => `${name ?? `The ${GII_HANDOFF_TEAM}`} ended the chat. Cros answers again.`,
  /** The divider closing a chat the team handed back. */
  ENDED_LABEL: 'Chat ended',
  /** The button on the team chat card: the agent ends the chat themselves. */
  END_CHAT: 'End chat',
  END_CHAT_TITLE: 'End the chat with the CROSSUB team and go back to Cros',
  END_FAILED: 'The chat with the CROSSUB team could not be ended. Please try again.',
  PLACEHOLDER: (name: string | null) => `Message ${name ?? `the ${GII_HANDOFF_TEAM}`}…`,
  SEND_FAILED: 'Your message could not be sent to the CROSSUB team. Please try again.',
  CLOSED_ON_SEND: 'The CROSSUB team has already handed this chat back to Cros.',
  /** The Talk to the team button, for an agent whose one inbox is Conversations. */
  TALK_TO_TEAM: `Talk to the ${GII_HANDOFF_TEAM}`,
  ASK_FOR_TEAM: `I'd like to talk to someone in the ${GII_HANDOFF_TEAM} about this property.`,
  /** Cros's tab bar button and chat starter: no property, the chat as a whole. */
  TEAM_BUTTON: GII_HANDOFF_TEAM,
  ASK_FOR_TEAM_ANY: `I'd like to talk to someone in the ${GII_HANDOFF_TEAM}.`,
  BACK_TO_TEAM: (name: string | null) => `Back to your chat with ${name ?? `the ${GII_HANDOFF_TEAM}`}`,
} as const;
