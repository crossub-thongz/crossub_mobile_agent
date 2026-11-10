/** Where a Cros chat waits while Open moves to the record's screen: on the page window, so a
 * panel reaches it even when its code is loaded twice. */
export const GII_CARRIED_CHAT_KEY = '__crosCarriedChat';

/** How long the next screen's panel has to take the chat up; after that a panel starts afresh. */
export const GII_CARRIED_CHAT_TTL_MS = 20_000;
