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

export type HouseholdTenant = {
  name: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
};

type HouseholdPersonInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string;
};

function householdPersonKey(name?: string | null, email?: string | null): string {
  const emailKey = email?.trim().toLowerCase() ?? '';
  if (emailKey.includes('@')) return `e:${emailKey}`;
  const nameKey = name?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  return nameKey ? `n:${nameKey}` : '';
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
    const key = householdPersonKey(name, email);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({
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
  return mergeHouseholdTenants({
    primary: {
      name: input.record?.tenantName ?? input.tenantContact?.name ?? input.property.tenantName,
      email:
        input.record?.tenantEmail ??
        input.tenantContact?.email ??
        input.property.tenantContact?.email,
      phone:
        input.record?.tenantPhone ??
        input.tenantContact?.phone ??
        input.property.tenantContact?.phone,
    },
    additional: [...(input.contacts ?? []), ...(input.property.additionalTenants ?? [])],
  });
}
