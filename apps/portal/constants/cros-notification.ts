/** Matches the assistant's name in a notification's text, never the CROSSUB brand. */
export const CROS_NAME_PATTERN = /\b(Cros|CROS)\b/;

/**
 * The first question Cros gets when the agent taps Ask on a notification. It says the card came
 * in, so a "Follow up: …" title is not read as a request to set another follow up.
 */
export const CROS_NOTIFICATION_ASK_PROMPT = (title: string): string =>
  `This notification came in: "${title}". What is it about, and what should I do now?`;

/** The bell's line under its heading when nothing is unread. */
export const NOTIFICATION_BELL_NONE_UNREAD = 'Nothing new';
