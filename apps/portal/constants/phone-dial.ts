/**
 * How the app presses a keypad digit for the caller.
 *
 * The CROSSUB agent line answers with a recorded menu, so dialling it alone leaves an agency
 * choosing between managers they have never met. Geng's instruction on 24 Aug 2026 was
 * 「属于哪个AGENT就联系到谁」 — the app knows whose portfolio it is showing, so it sends the
 * digit itself and the agent taps once.
 *
 * A comma is the pause character every mobile dialer understands (~2 seconds each on both
 * iOS and Android). `;` is deliberately not used: it means *wait*, and the phone stops and
 * asks the caller to confirm — which is the tap we are removing.
 */

/** One pause character, ~2 seconds on both platforms. */
export const DIAL_PAUSE = ',';

/**
 * Pauses inserted before the digit. The line's greeting runs about twelve seconds and the
 * menu accepts a key while it is still playing, so this waits only long enough for the call
 * to be answered and the audio path to open — pressing sooner drops the tone, and waiting
 * out the whole greeting would make a one-tap call feel broken.
 */
export const DIAL_MENU_PAUSES = 3;
