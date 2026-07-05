/** Strip spaces/formatting for `tel:` links. */
export function normalizePhoneForTel(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/** Open the device dialer (mobile) or tel handler (desktop). */
export function placePhoneCall(phone: string): void {
  const normalized = normalizePhoneForTel(phone);
  if (!normalized) return;
  window.location.href = `tel:${normalized}`;
}
