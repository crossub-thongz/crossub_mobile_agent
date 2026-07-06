import type { PropertyPartyContact } from '@/lib/types';

export type { PropertyPartyContact };

export function emptyPartyContact(): PropertyPartyContact {
  return { name: '', email: '', phone: '' };
}

/** Drop blank rows; trim fields. */
export function normalizeParties(entries: PropertyPartyContact[]): PropertyPartyContact[] {
  return entries
    .map((e) => ({
      name: e.name.trim(),
      email: e.email?.trim() || undefined,
      phone: e.phone?.trim() || undefined,
    }))
    .filter((e) => e.name || e.email || e.phone);
}

export function splitParties(entries: PropertyPartyContact[]) {
  const parties = normalizeParties(entries);
  const primary = parties[0];
  const additional = parties.slice(1);
  const label =
    parties
      .map((p) => p.name)
      .filter(Boolean)
      .join(' & ') || 'Vacant';
  return { primary, additional, label };
}
