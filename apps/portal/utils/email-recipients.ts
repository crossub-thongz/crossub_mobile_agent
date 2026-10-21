/** A full address, so a half-typed name never passes for a recipient. */
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
