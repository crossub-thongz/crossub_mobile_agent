/**
 * Overview shows the primary contact's phone, not the property notice phone.
 * Return the notice phone to copy onto that contact, or null when the contact
 * should be left as it is.
 */
export function noticePhoneToMirror(input: {
  noticePhone: string;
  seededNoticePhone: string;
  contactPhoneAtOpen: string;
  liveContactPhone: string;
}): string | null {
  const notice = input.noticePhone.trim();
  const live = input.liveContactPhone.trim();
  if (!notice || notice === live) return null;
  const seeded = input.seededNoticePhone.trim();
  const opened = input.contactPhoneAtOpen.trim();
  const edited = notice !== seeded;
  const confirmingSavedPhone = notice === seeded && seeded !== opened && live === opened;
  return edited || confirmingSavedPhone ? notice : null;
}
