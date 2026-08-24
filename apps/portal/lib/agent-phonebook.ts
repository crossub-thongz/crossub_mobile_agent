import type { Agency, Property } from '@/lib/types';

export type AgentPhonebookGroup = 'crossub' | 'tenant' | 'landlord' | 'agency';

export interface AgentPhonebookContact {
  id: string;
  name: string;
  phone: string;
  /** Keypad digit to send after the line answers — CROSSUB contacts only. */
  extension?: string;
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
  /** Keypad digit that reaches this manager past the line's menu. */
  extension?: string;
}

type AccountManagerFields = Pick<
  Property,
  | 'accountManagerName'
  | 'accountManagerEmail'
  | 'accountManagerPhone'
  | 'accountManagerExtension'
>;

/**
 * Who the Account Manager *is*. Name and email only: since 24 Aug 2026 the API returns one
 * shared agency-facing line on every record, so a phone number no longer tells us an
 * Account Manager was resolved — treating it as identity would fill the card with the
 * "Your Account Manager" placeholder even where a real name is on file elsewhere.
 */
function hasAccountManagerIdentity(source: AccountManagerFields): boolean {
  return Boolean(source.accountManagerName || source.accountManagerEmail);
}

function accountManagerLine(source: AccountManagerFields | undefined): string | undefined {
  return source?.accountManagerPhone ?? undefined;
}

/**
 * The CROSSUB staff member an agency should phone. A property's own Account Manager wins;
 * otherwise the first agency carrying a name or email, then the first property that does.
 *
 * The number is resolved separately from the name because they no longer travel together:
 * every record carries the same agency-facing line (the phone system routes the caller to
 * their own manager), so a portfolio with no assigned officer still gets a working call
 * button — it just asks for "Your Account Manager". Returns null only when neither a name
 * nor a line is on file anywhere.
 */
export function resolveAccountManagerContact(
  properties: Property[],
  agencies: Agency[],
  propertyId?: string,
): AgentAccountManager | null {
  const scoped = propertyId ? properties.find((p) => p.id === propertyId) : undefined;
  const identified =
    (scoped && hasAccountManagerIdentity(scoped) ? scoped : undefined) ??
    agencies.find(hasAccountManagerIdentity) ??
    properties.find(hasAccountManagerIdentity);
  const phone =
    accountManagerLine(identified) ??
    accountManagerLine(scoped) ??
    accountManagerLine(agencies.find((a) => a.accountManagerPhone)) ??
    accountManagerLine(properties.find((p) => p.accountManagerPhone));
  if (!identified && !phone) return null;
  return {
    name: identified?.accountManagerName ?? ACCOUNT_MANAGER_FALLBACK_NAME,
    email: identified?.accountManagerEmail,
    phone,
    // The digit identifies the MANAGER, not the line, so it comes from the same record the
    // name did. Taking it from wherever the line came from would press a key for one manager
    // while the card names another.
    extension: identified?.accountManagerExtension,
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
    const key = `${contact.group}:${contact.phone}:${contact.extension ?? ''}:${contact.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    contacts.push(contact);
  };

  // Account Managers first: the same officer usually covers many properties, and the `seen`
  // key (group:phone:name) collapses them into one row. Every manager shares one line, so
  // the name is what separates two rows here.
  for (const property of properties) {
    if (property.accountManagerPhone && hasAccountManagerIdentity(property)) {
      add({
        id: `am-property-${property.id}`,
        name: property.accountManagerName ?? ACCOUNT_MANAGER_FALLBACK_NAME,
        phone: property.accountManagerPhone,
        extension: property.accountManagerExtension,
        email: property.accountManagerEmail ?? undefined,
        group: 'crossub',
        subtitle: ACCOUNT_MANAGER_SUBTITLE,
      });
    }
  }

  for (const agency of agencies) {
    if (agency.accountManagerPhone && hasAccountManagerIdentity(agency)) {
      add({
        id: `am-agency-${agency.id}`,
        name: agency.accountManagerName ?? ACCOUNT_MANAGER_FALLBACK_NAME,
        phone: agency.accountManagerPhone,
        extension: agency.accountManagerExtension,
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
