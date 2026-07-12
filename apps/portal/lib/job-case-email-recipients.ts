import type { Property, PropertyPartyContact } from '@/lib/types';

export interface WorkflowEmailContact {
  role: string;
  name?: string;
  email: string;
}

export function formatWorkflowEmailContact(contact: WorkflowEmailContact): string {
  return `[${contact.role}] ${contact.email}`;
}

function pushContact(
  list: WorkflowEmailContact[],
  seen: Set<string>,
  role: string,
  email: string | null | undefined,
  name?: string | null,
): void {
  const trimmed = email?.trim();
  if (!trimmed || !trimmed.includes('@')) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  list.push({ role, name: name?.trim() || undefined, email: trimmed });
}

function pushPartyContacts(
  list: WorkflowEmailContact[],
  seen: Set<string>,
  role: string,
  parties: PropertyPartyContact[] | undefined,
): void {
  if (!parties?.length) return;
  parties.forEach((party, index) => {
    const label = parties.length > 1 ? `${role} ${index + 2}` : role;
    pushContact(list, seen, label, party.email, party.name);
  });
}

type PropertyWithStrata = Property & {
  strataContactName?: string | null;
  strataContactEmail?: string | null;
};

/** Landlord, tenant, and strata emails for workflow compose (reply / forward). */
export function buildPropertyWorkflowEmailContacts(
  property: Property | null | undefined,
  options?: { tenantName?: string | null },
): WorkflowEmailContact[] {
  if (!property) return [];

  const ext = property as PropertyWithStrata;
  const contacts: WorkflowEmailContact[] = [];
  const seen = new Set<string>();

  pushContact(contacts, seen, 'Landlord', property.homeOwnerContact?.email, property.homeOwnerName);
  pushPartyContacts(contacts, seen, 'Landlord', property.additionalLandlords);

  const tenantName = options?.tenantName?.trim() || property.tenantName;
  pushContact(contacts, seen, 'Tenant', property.tenantContact?.email, tenantName);
  pushPartyContacts(contacts, seen, 'Tenant', property.additionalTenants);

  const draft =
    property.registryDraft && typeof property.registryDraft === 'object'
      ? (property.registryDraft as Record<string, unknown>)
      : null;
  const strataEmail =
    ext.strataContactEmail ??
    (typeof draft?.strataContactEmail === 'string' ? draft.strataContactEmail : undefined);
  const strataName =
    ext.strataContactName ??
    (typeof draft?.strataContactName === 'string' ? draft.strataContactName : undefined);

  pushContact(contacts, seen, 'Strata', strataEmail, strataName);

  return contacts;
}

export function formatWorkflowEmailContactBlock(contacts: WorkflowEmailContact[]): string {
  if (contacts.length === 0) return '';
  return `Suggested recipients:\n${contacts.map((c) => formatWorkflowEmailContact(c)).join('\n')}\n`;
}
