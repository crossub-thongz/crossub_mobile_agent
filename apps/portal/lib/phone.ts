import { DIAL_MENU_PAUSES, DIAL_PAUSE } from '@/constants/phone-dial';

/** Strip spaces/formatting for `tel:` links. */
export function normalizePhoneForTel(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * The `tel:` payload for a number, plus the keypad digit to send once it answers.
 *
 * Kept separate from {@link placePhoneCall} so it can be read in a test — the whole feature
 * is one string, and a wrong one either dials a mangled number or connects an agency to the
 * wrong Account Manager.
 */
export function buildDialString(phone: string, extension?: string | null): string {
  const number = normalizePhoneForTel(phone);
  if (!number) return '';
  const digits = extension?.replace(/[^\d*#]/g, '') ?? '';
  if (!digits) return number;
  return `${number}${DIAL_PAUSE.repeat(DIAL_MENU_PAUSES)}${digits}`;
}

/**
 * Open the device dialer (mobile) or tel handler (desktop). Pass `extension` to have the
 * dialer press a menu key after the call connects.
 */
export function placePhoneCall(phone: string, extension?: string | null): void {
  const dial = buildDialString(phone, extension);
  if (!dial) return;
  window.location.href = `tel:${dial}`;
}
