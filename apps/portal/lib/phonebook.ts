import type { Property, PropertyContact } from '@/lib/types';

export interface PhonebookEntry {
  id: string;
  name: string;
  role: 'landlord' | 'tenant';
  contact: PropertyContact;
  properties: string[];
}

function contactKey(name: string, contact: PropertyContact): string {
  return `${name.toLowerCase()}|${contact.email ?? ''}|${contact.phone ?? ''}`;
}

export function buildPhonebook(properties: Property[]): {
  landlords: PhonebookEntry[];
  tenants: PhonebookEntry[];
} {
  const landlordMap = new Map<string, PhonebookEntry>();
  const tenantMap = new Map<string, PhonebookEntry>();

  for (const property of properties) {
    const address = `${property.address}, ${property.suburb}`;

    const ownerKey = contactKey(property.homeOwnerName, property.homeOwnerContact);
    const existingOwner = landlordMap.get(ownerKey);
    if (existingOwner) {
      if (!existingOwner.properties.includes(address)) {
        existingOwner.properties.push(address);
      }
    } else {
      landlordMap.set(ownerKey, {
        id: `owner-${ownerKey}`,
        name: property.homeOwnerName,
        role: 'landlord',
        contact: property.homeOwnerContact,
        properties: [address],
      });
    }

    if (property.tenantName.toLowerCase() === 'vacant') continue;

    const tenantName = property.tenantName.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const tenantKey = contactKey(tenantName, property.tenantContact);
    const existingTenant = tenantMap.get(tenantKey);
    if (existingTenant) {
      if (!existingTenant.properties.includes(address)) {
        existingTenant.properties.push(address);
      }
    } else {
      tenantMap.set(tenantKey, {
        id: `tenant-${tenantKey}`,
        name: tenantName,
        role: 'tenant',
        contact: property.tenantContact,
        properties: [address],
      });
    }
  }

  const sortByName = (a: PhonebookEntry, b: PhonebookEntry) =>
    a.name.localeCompare(b.name);

  return {
    landlords: [...landlordMap.values()].sort(sortByName),
    tenants: [...tenantMap.values()].sort(sortByName),
  };
}
