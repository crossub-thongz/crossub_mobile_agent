import type { PropertyPartyContact } from '@/lib/types';

export type { PropertyPartyContact };

/** Matches API `MAX_PROPERTY_TENANT_CONTACTS` / `TenancyTenant` household cap. */
export const MAX_TENANCY_TENANTS = 5;

export function emptyPartyContact(
  overrides?: Partial<PropertyPartyContact>,
): PropertyPartyContact {
  return { name: '', email: '', phone: '', isPrimary: false, ...overrides };
}

/** Drop blank rows; trim fields. Keeps `isPrimary` so a flagged co-tenant stays primary. */
export function normalizeParties(entries: PropertyPartyContact[]): PropertyPartyContact[] {
  return entries
    .map((e) => ({
      name: e.name.trim(),
      email: e.email?.trim() || undefined,
      phone: e.phone?.trim() || undefined,
      isPrimary: e.isPrimary === true,
    }))
    .filter((e) => e.name || e.email || e.phone);
}

/** Exactly one primary per list. Falls back to the first row when none is flagged. */
export function ensureExactlyOnePrimary(
  parties: PropertyPartyContact[],
): PropertyPartyContact[] {
  if (parties.length === 0) {
    return [emptyPartyContact({ isPrimary: true })];
  }
  const flagged = parties.findIndex((p) => p.isPrimary);
  const primaryIndex = flagged >= 0 ? flagged : 0;
  return parties.map((p, i) => ({ ...p, isPrimary: i === primaryIndex }));
}

export function setPrimaryParty(
  parties: PropertyPartyContact[],
  index: number,
): PropertyPartyContact[] {
  if (index < 0 || index >= parties.length) return ensureExactlyOnePrimary(parties);
  return parties.map((p, i) => ({ ...p, isPrimary: i === index }));
}

export function splitParties(entries: PropertyPartyContact[]) {
  const parties = ensureExactlyOnePrimary(normalizeParties(entries));
  const primaryIndex = parties.findIndex((p) => p.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;
  const primary = parties[resolvedPrimaryIndex];
  const additional = parties.filter((_, i) => i !== resolvedPrimaryIndex);
  const label =
    parties
      .map((p) => p.name)
      .filter(Boolean)
      .join(' & ') || 'Vacant';
  return { primary, additional, label };
}
