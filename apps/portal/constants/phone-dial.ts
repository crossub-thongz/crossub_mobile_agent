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
 * Pauses inserted before the digit — long enough for the call to be answered, and no longer.
 *
 * The tone is sent on a timer, not on an event: too early and it lands before the line picks
 * up and is simply lost, leaving the caller sitting in the menu the app was supposed to skip.
 * Too late and a one-tap call feels broken. Four seconds is the compromise, and it stopped
 * needing to cover the twelve-second recording once that greeting was cut down — the menu
 * accepts a key while the prompt is still playing, so the only thing being waited on is the
 * answer itself. Worth retuning against a real handset rather than by reasoning: one test
 * call to the agency line either connects or leaves you listening to the menu.
 */
export const DIAL_MENU_PAUSES = 2;
