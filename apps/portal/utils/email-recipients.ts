/** A full address, so a half-typed name never passes for a recipient. */
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Addresses in one stored field (`a@x.com, b@y.com`), or the raw value when it is not a list. */
export function splitEmailList(value: string): string[] {
  const parts = value
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const emails = parts.filter(isEmailAddress);
  if (emails.length > 0) return emails;
  const raw = value.trim();
  return raw ? [raw] : [];
}

export function isEmailAddress(value: string): boolean {
  return EMAIL_ADDRESS_PATTERN.test(value.trim());
}

/** The list with `typed` added once (case-insensitive), or the same list when there is nothing new. */
export function addRecipient(recipients: readonly string[], typed: string): readonly string[] {
  const address = typed.trim();
  if (!address) return recipients;
  if (recipients.some((r) => r.toLowerCase() === address.toLowerCase())) return recipients;
  return [...recipients, address];
}

/**
 * The list as it will be sent: an address typed but not yet added counts once it is a full
 * address, since it already reads as a recipient in the box.
 */
export function recipientsWithTyped(recipients: readonly string[], typed: string): readonly string[] {
  return isEmailAddress(typed) ? addRecipient(recipients, typed) : recipients;
}
