import type { Agency, Property } from '@/lib/types';

export type AgentPhonebookGroup = 'tenant' | 'landlord' | 'agency';

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
  tenant: 'Tenants',
  landlord: 'Landlords',
  agency: 'Client agencies',
};

const GROUP_ORDER: AgentPhonebookGroup[] = ['tenant', 'landlord', 'agency'];

/** Contacts for one property (tenant + landlord on file). */
export function phonebookContactsForProperty(
  propertyId: string,
  contacts: AgentPhonebookContact[],
): AgentPhonebookContact[] {
  return contacts.filter(
    (c) => c.id === `tenant-${propertyId}` || c.id === `landlord-${propertyId}`,
  );
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
