import type { Agency, Property } from '@/lib/types';

export type AgentPhonebookGroup = 'crossub' | 'tenant' | 'landlord' | 'agency';

export interface AgentPhonebookContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  group: AgentPhonebookGroup;
  /** Property address or agency name for context. */
  subtitle?: string;
}

export const AGENT_PHONEBOOK_GROUP_LABEL: Record<AgentPhonebookGroup, string> = {
  crossub: 'CROSSUB Account Manager',
  tenant: 'Tenants',
  landlord: 'Landlords',
  agency: 'Client agencies',
};

/** The Account Manager leads — the person an agency most needs to reach. */
const GROUP_ORDER: AgentPhonebookGroup[] = ['crossub', 'tenant', 'landlord', 'agency'];

const ACCOUNT_MANAGER_FALLBACK_NAME = 'Your Account Manager';
const ACCOUNT_MANAGER_SUBTITLE = 'CROSSUB';

/** Contacts for one property (Account Manager + tenant + landlord on file). */
export function phonebookContactsForProperty(
  propertyId: string,
  contacts: AgentPhonebookContact[],
): AgentPhonebookContact[] {
  const scoped = contacts.filter(
    (c) =>
      c.id === `am-property-${propertyId}` ||
      c.id === `tenant-${propertyId}` ||
      c.id === `landlord-${propertyId}`,
  );
  // One officer covers many properties and the builder dedups by phone+name, so this
  // property's `am-property-*` row usually collapsed into another property's. Any
  // CROSSUB contact is the same team — fall back so every scoped list shows an AM.
  if (!scoped.some((c) => c.group === 'crossub')) {
    const fallback = contacts.find((c) => c.group === 'crossub');
    if (fallback) scoped.unshift(fallback);
  }
  return scoped;
}

/** The resolved CROSSUB staff contact — any field may be missing except `name`. */
export interface AgentAccountManager {
  name: string;
  email?: string;
  phone?: string;
}

type AccountManagerFields = Pick<
  Property,
  'accountManagerName' | 'accountManagerEmail' | 'accountManagerPhone'
>;

function hasAccountManager(source: AccountManagerFields): boolean {
  return Boolean(
    source.accountManagerName ||
      source.accountManagerEmail ||
      source.accountManagerPhone,
  );
}

/**
 * The CROSSUB staff member an agency should phone. A property's own Account Manager wins;
 * otherwise the first agency carrying any of the three fields, then the first property that
 * does. Returns null when nothing is on file — callers render nothing rather than a
 * placeholder card.
 */
export function resolveAccountManagerContact(
  properties: Property[],
  agencies: Agency[],
  propertyId?: string,
): AgentAccountManager | null {
  const scoped = propertyId ? properties.find((p) => p.id === propertyId) : undefined;
  const source =
    (scoped && hasAccountManager(scoped) ? scoped : undefined) ??
    agencies.find(hasAccountManager) ??
    properties.find(hasAccountManager);
  if (!source) return null;
  return {
    name: source.accountManagerName ?? ACCOUNT_MANAGER_FALLBACK_NAME,
    email: source.accountManagerEmail,
    phone: source.accountManagerPhone,
  };
}

/** Contacts the signed-in Account Manager can call — tenants, landlords, agency reps. */
export function buildAgentPhonebook(
  properties: Property[],
  agencies: Agency[],
): AgentPhonebookContact[] {
  const contacts: AgentPhonebookContact[] = [];
  const seen = new Set<string>();

  const add = (contact: AgentPhonebookContact) => {
    const key = `${contact.group}:${contact.phone}:${contact.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    contacts.push(contact);
  };

  // Account Managers first: the same officer usually covers many properties, and the `seen`
  // key (group:phone:name) collapses them into one row.
  for (const property of properties) {
    if (property.accountManagerPhone) {
      add({
        id: `am-property-${property.id}`,
        name: property.accountManagerName ?? ACCOUNT_MANAGER_FALLBACK_NAME,
        phone: property.accountManagerPhone,
        email: property.accountManagerEmail ?? undefined,
        group: 'crossub',
        subtitle: ACCOUNT_MANAGER_SUBTITLE,
      });
    }
  }

  for (const agency of agencies) {
    if (agency.accountManagerPhone) {
      add({
        id: `am-agency-${agency.id}`,
        name: agency.accountManagerName ?? ACCOUNT_MANAGER_FALLBACK_NAME,
        phone: agency.accountManagerPhone,
        email: agency.accountManagerEmail ?? undefined,
        group: 'crossub',
        subtitle: ACCOUNT_MANAGER_SUBTITLE,
      });
    }
  }

  for (const property of properties) {
    const addr = `${property.address}, ${property.suburb}`;
    if (
      property.tenantContact.phone &&
      property.tenantName.toLowerCase() !== 'vacant'
    ) {
      add({
        id: `tenant-${property.id}`,
        name: property.tenantName,
        phone: property.tenantContact.phone,
        email: property.tenantContact.email,
        group: 'tenant',
        subtitle: addr,
      });
    }
    if (property.homeOwnerContact.phone) {
      add({
        id: `landlord-${property.id}`,
        name: property.homeOwnerName,
        phone: property.homeOwnerContact.phone,
        email: property.homeOwnerContact.email,
        group: 'landlord',
        subtitle: addr,
      });
    }
  }

  for (const agency of agencies) {
    if (agency.contactPhone) {
      add({
        id: `agency-${agency.id}`,
        name: agency.contactName ?? agency.name,
        phone: agency.contactPhone,
        email: agency.contactEmail,
        group: 'agency',
        subtitle: agency.name,
      });
    }
  }

  return contacts.sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(a.group);
    const gb = GROUP_ORDER.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    return a.name.localeCompare(b.name);
  });
}
