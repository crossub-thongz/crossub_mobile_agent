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

/** Filled landlord/tenant rows from a registry draft, if the payload still carries them. */
export function readRegistryDraftParties(
  raw: unknown,
  key: 'tenants' | 'landlords',
): PropertyPartyContact[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const list = (raw as Record<string, unknown>)[key];
  if (!Array.isArray(list)) return [];
  return list
    .map((row): PropertyPartyContact | null => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
      const party = row as Record<string, unknown>;
      const name = typeof party.name === 'string' ? party.name.trim() : '';
      const email = typeof party.email === 'string' ? party.email.trim() : '';
      const phone = typeof party.phone === 'string' ? party.phone.trim() : '';
      if (!name && !email && !phone) return null;
      return {
        name,
        email: email || undefined,
        phone: phone || undefined,
        isPrimary: party.isPrimary === true,
      };
    })
    .filter((row): row is PropertyPartyContact => row != null);
}

export type HouseholdTenant = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
};

type HouseholdPersonInput = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string;
  isPrimary?: boolean;
  sortOrder?: number;
};

function householdPersonKey(name?: string | null, email?: string | null): string {
  const emailKey = email?.trim().toLowerCase() ?? '';
  if (emailKey.includes('@')) return `e:${emailKey}`;
  const nameKey = name?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  return nameKey ? `n:${nameKey}` : '';
}

/** Same person if emails match, or if names match when an email cannot decide. */
export function isSameHouseholdPerson(
  a: { name?: string | null; email?: string | null },
  b: { name?: string | null; email?: string | null },
): boolean {
  const aEmail = householdPersonKey(null, a.email);
  const bEmail = householdPersonKey(null, b.email);
  if (aEmail && bEmail && aEmail === bEmail) return true;
  const aName = householdPersonKey(a.name, null);
  const bName = householdPersonKey(b.name, null);
  return Boolean(aName) && aName === bName;
}

/**
 * Primary registry tenant plus extra TENANT contacts, de-duplicated by email then name.
 * Used for household count (max 5) and "Current tenancy" / tenancy-details labels.
 */
export function mergeHouseholdTenants(input: {
  primary?: HouseholdPersonInput;
  additional?: HouseholdPersonInput[];
}): HouseholdTenant[] {
  const out: HouseholdTenant[] = [];
  const seen = new Set<string>();

  const push = (row: HouseholdPersonInput | undefined, isPrimary: boolean) => {
    if (!row) return;
    if (row.role && row.role !== 'TENANT') return;
    const name = row.name?.trim() ?? '';
    const email = row.email?.trim() ?? '';
    const phone = row.phone?.trim() ?? '';
    if (!name && !email && !phone) return;
    if (name.toLowerCase() === 'vacant') return;
    const emailKey = householdPersonKey(null, email);
    const nameKey = householdPersonKey(name, null);
    if ((emailKey && seen.has(emailKey)) || (nameKey && seen.has(nameKey))) {
      return;
    }
    if (!emailKey && !nameKey) return;
    if (emailKey) seen.add(emailKey);
    if (nameKey) seen.add(nameKey);
    out.push({
      id: row.id?.trim() || undefined,
      name: name || email || 'Unnamed tenant',
      email: email || undefined,
      phone: phone || undefined,
      isPrimary,
    });
  };

  push(input.primary, true);
  for (const row of input.additional ?? []) {
    push(row, false);
  }
  return out;
}

export function formatHouseholdTenantNames(tenants: HouseholdTenant[]): string {
  const names = tenants.map((t) => t.name.trim()).filter(Boolean);
  if (names.length === 0) return '—';
  return names.join(' & ');
}

function sortHouseholdContacts(contacts: HouseholdPersonInput[]): HouseholdPersonInput[] {
  return [...contacts].sort((a, b) => {
    if (Boolean(a.isPrimary) !== Boolean(b.isPrimary)) return a.isPrimary ? -1 : 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

function matchingHouseholdContact(
  contacts: HouseholdPersonInput[],
  name?: string | null,
  email?: string | null,
): HouseholdPersonInput | undefined {
  const emailKey = householdPersonKey(null, email);
  const nameKey = householdPersonKey(name, null);
  return contacts.find((row) => {
    const rowEmail = householdPersonKey(null, row.email);
    if (emailKey && rowEmail && emailKey === rowEmail) return true;
    const rowName = householdPersonKey(row.name, null);
    return Boolean(nameKey) && nameKey === rowName;
  });
}

export function householdTenantsFromOverview(input: {
  isVacant?: boolean;
  record?: {
    tenantName?: string | null;
    tenantEmail?: string | null;
    tenantPhone?: string | null;
  } | null;
  tenantContact?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  property: {
    tenantName?: string | null;
    tenantContact?: { email?: string | null; phone?: string | null };
    additionalTenants?: Array<{
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    }>;
  };
  contacts?: HouseholdPersonInput[];
}): HouseholdTenant[] {
  if (input.isVacant) return [];
  void input.tenantContact;

  const contacts = sortHouseholdContacts(
    (input.contacts ?? []).filter((row) => !row.role || row.role === 'TENANT'),
  );
  const extras = input.property.additionalTenants ?? [];
  const flaggedPrimary = contacts.find((row) => row.isPrimary === true);
  if (flaggedPrimary) {
    return mergeHouseholdTenants({
      primary: flaggedPrimary,
      additional: [...contacts.filter((row) => row !== flaggedPrimary), ...extras],
    });
  }

  // Registry occupant stays Tenant 1. `tenantContact` prefers the newest lease/applicant
  // and will mix that person's email onto the original name after each "Add tenant".
  const registryName = input.record?.tenantName ?? input.property.tenantName;
  const registryEmail =
    input.record?.tenantEmail ?? input.property.tenantContact?.email;
  const registryPhone =
    input.record?.tenantPhone ?? input.property.tenantContact?.phone;

  if (registryName?.trim()) {
    const match = matchingHouseholdContact(contacts, registryName, registryEmail);
    return mergeHouseholdTenants({
      primary: {
        id: match?.id,
        name: registryName,
        email: match?.email ?? registryEmail,
        phone: match?.phone ?? registryPhone,
      },
      additional: [...contacts.filter((row) => row !== match), ...extras],
    });
  }

  if (contacts.length > 0) {
    const [first, ...rest] = contacts;
    return mergeHouseholdTenants({
      primary: first,
      additional: [...rest, ...extras],
    });
  }

  return mergeHouseholdTenants({
    primary: {
      name: registryName,
      email: registryEmail,
      phone: registryPhone,
    },
    additional: extras,
  });
}

export function primaryTenantDisplayName(
  input: Parameters<typeof householdTenantsFromOverview>[0],
  fallback = '—',
): string {
  if (input.isVacant) return 'Vacant';
  return householdTenantsFromOverview(input)[0]?.name?.trim() || fallback;
}
