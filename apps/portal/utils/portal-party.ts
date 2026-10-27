import {
  TENANCY_PLACEHOLDER,
  TENANT_NAME_COMMA_PATTERN,
  TENANT_NAME_JOIN_PATTERN,
} from '@/constants/property-tenancies';

/**
 * Is this the same person? Port of `isSamePortalParty` / `resolvePortalCoContacts` in the admin
 * web (`modules/properties/property-portal-utils.ts`), so the agent portal folds the same people
 * into one household.
 */
export interface PortalParty {
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
}

/** Score at which two rows are the same human: a phone (2) or a name (4); an email alone (1) is not. */
const SAME_PARTY_SCORE = 2;
const NAME_SCORE = 4;
const PHONE_SCORE = 2;
const EMAIL_SCORE = 1;
const MIN_PHONE_DIGITS = 6;

function emailKey(email?: string | null): string | undefined {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
}

function phoneKey(phone?: string | null): string | undefined {
  const digits = phone?.replace(/\D/g, '');
  return digits && digits.length >= MIN_PHONE_DIGITS ? digits : undefined;
}

function nameKey(name?: string | null): string | undefined {
  const normalized = name?.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized && normalized !== TENANCY_PLACEHOLDER ? normalized : undefined;
}

function matchScore(a: PortalParty, b: PortalParty): number {
  const name = nameKey(a.name);
  const phone = phoneKey(a.mobile);
  const email = emailKey(a.email);
  let score = 0;
  if (name && name === nameKey(b.name)) score += NAME_SCORE;
  if (phone && phone === phoneKey(b.mobile)) score += PHONE_SCORE;
  if (email && email === emailKey(b.email)) score += EMAIL_SCORE;
  return score;
}

export function isSamePortalParty(a: PortalParty, b: PortalParty): boolean {
  return matchScore(a, b) >= SAME_PARTY_SCORE;
}

/**
 * Everyone on the property in `role` except the one person already shown as the primary. Drops
 * exactly one row, the best match, so two tenants sharing an email both stay.
 */
export function resolvePortalCoContacts<T extends PortalParty & { role: string; isPrimary: boolean }>(
  contacts: readonly T[],
  role: string,
  primary?: PortalParty | null,
): T[] {
  if (!primary || !nameKey(primary.name)) return [];

  const candidates = contacts.filter(
    (contact) =>
      contact.role === role &&
      Boolean(nameKey(contact.name) ?? emailKey(contact.email) ?? phoneKey(contact.mobile)),
  );

  let primaryIndex = -1;
  let bestScore = 0;
  candidates.forEach((contact, index) => {
    const score = matchScore(contact, primary);
    if (score > bestScore) {
      bestScore = score;
      primaryIndex = index;
    }
  });
  if (primaryIndex < 0) primaryIndex = candidates.findIndex((contact) => contact.isPrimary);

  const primaryName = nameKey(primary.name) ?? '';
  const seen = new Set<string>();
  return candidates.filter((contact, index) => {
    if (index === primaryIndex) return false;
    const name = nameKey(contact.name);
    const email = emailKey(contact.email);
    const phone = phoneKey(contact.mobile);
    if (!email && !phone && name && primaryName.includes(name)) return false;
    const key = [name ?? '', email ?? '', phone ?? ''].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Split a joined registry name ("A & B, C") into the people it names. A comma-only name stays whole. */
export function splitJoinedTenantName(name: string | null | undefined): string[] {
  const value = name?.trim();
  if (!value) return [];
  const joined = value
    .split(TENANT_NAME_JOIN_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean);
  if (joined.length > 1) {
    return joined.flatMap((part) =>
      part
        .split(TENANT_NAME_COMMA_PATTERN)
        .map((p) => p.trim())
        .filter(Boolean),
    );
  }
  return [value];
}

/** Up to two initials for an avatar ("Jordan Lee" → "JL"). */
export function personInitials(name: string | null | undefined): string {
  return (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
