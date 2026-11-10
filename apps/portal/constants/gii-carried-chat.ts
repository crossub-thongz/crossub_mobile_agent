/** Where a Cros chat waits while Open moves to the record's screen: on the page window, so a
 * panel reaches it even when its code is loaded twice. */
export const GII_CARRIED_CHAT_KEY = '__crosCarriedChat';

/** How long the next screen's panel has to take the chat up; after that a panel starts afresh. */
export const GII_CARRIED_CHAT_TTL_MS = 20_000;

export const GII_CARRIED_CHAT_COPY = {
  /** The panel's Back button after Open: the chat goes back to the screen it came from. */
  BACK: 'Back to where you were',
  /** A job row for the record already on screen. */
  ALREADY_OPEN: 'This job is already open on the page.',
} as const;
